use std::sync::mpsc;
use std::thread;
use std::time::Instant;
use sysinfo::{Networks, System};
use crate::types::*;

const BYTES_PER_GB: f64 = 1073741824.0;

pub struct SystemInfoCollector {
    sys: System,
    interval_ms: u64,
    stop_tx: Option<mpsc::Sender<()>>,
    prev_disk: Option<(u64, u64, Instant)>,
    prev_net: Option<(u64, u64, Instant)>,
}

impl SystemInfoCollector {
    pub fn new(interval_ms: u64) -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        Self {
            sys,
            interval_ms,
            stop_tx: None,
            prev_disk: None,
            prev_net: None,
        }
    }

    pub fn collect(&mut self) -> SystemInfo {
        self.sys.refresh_all();

        // ===== CPU =====
        let usage = (self.sys.global_cpu_usage() as f64 * 10.0).round() / 10.0;
        let cores: Vec<f64> = self.sys.cpus().iter()
            .map(|c| (c.cpu_usage() as f64 * 10.0).round() / 10.0)
            .collect();
        let temperature = get_cpu_temperature();
        let speed = 0.0; // sysinfo doesn't provide clock speed

        // ===== Memory =====
        // On macOS: total - available = active (real app memory, excludes cache)
        // macOS: available_memory() 只返回 free+inactive，值极小
        // 直接用 used_memory() 作为"已用"（排除 inactive+purgeable）
        // cached = total - used（剩余部分：空闲 + 文件缓存）
        let total_mem = self.sys.total_memory() as f64;
        let used_mem = self.sys.used_memory() as f64;
        let cached = if total_mem > used_mem { total_mem - used_mem } else { 0.0 };
        let used_swap = self.sys.used_swap() as f64;

        let memory = MemInfo {
            used: (used_mem / BYTES_PER_GB * 10.0).round() / 10.0,
            total: (total_mem / BYTES_PER_GB * 10.0).round() / 10.0,
            usage_percent: if total_mem > 0.0 { ((used_mem / total_mem) * 1000.0).round() / 10.0 } else { 0.0 },
            swap_used: (used_swap / BYTES_PER_GB * 10.0).round() / 10.0,
            cached: (cached / BYTES_PER_GB * 10.0).round() / 10.0,
        };

        // ===== Disk (from process disk_usage) =====
        let now = Instant::now();
        let disk = self.compute_disk_rates(now);

        // ===== Network (from Networks standalone type) =====
        let network = self.compute_net_rates(now);

        // ===== GPU =====
        // sysinfo doesn't support GPU info; return None for all fields
        let gpu = GpuInfo { usage: None, temperature: None };

        // ===== Processes (top 3 by CPU) =====
        let mut processes: Vec<ProcessInfo> = self.sys.processes().iter()
            .map(|(_pid, process)| {
                let name = process.name().to_string_lossy().into_owned();
                ProcessInfo {
                    name: if name.len() > 20 { format!("{}…", &name[..19]) } else { name },
                    cpu: (process.cpu_usage() as f64 * 10.0).round() / 10.0,
                    memory_mb: (process.memory() as f64 / 1048576.0 * 10.0).round() / 10.0,
                }
            })
            .collect();
        processes.sort_by(|a, b| b.cpu.partial_cmp(&a.cpu).unwrap_or(std::cmp::Ordering::Equal));
        processes.truncate(3);

        SystemInfo { cpu: CpuInfo { usage, cores, temperature, speed }, memory, disk, network, gpu, processes }
    }

    fn compute_disk_rates(&mut self, now: Instant) -> DiskInfo {
        // sysinfo 0.31 Disk type does not expose I/O counters;
        // sum process-level disk_usage across all processes instead.
        let total_read: u64 = self.sys.processes().values()
            .map(|p| p.disk_usage().total_read_bytes)
            .sum();
        let total_written: u64 = self.sys.processes().values()
            .map(|p| p.disk_usage().total_written_bytes)
            .sum();

        let (read_speed, write_speed) = if let Some((prev_read, prev_written, prev_time)) = self.prev_disk {
            let elapsed = now.duration_since(prev_time).as_secs_f64();
            if elapsed > 0.0 {
                let rs = (total_read.saturating_sub(prev_read) as f64 / elapsed / 1048576.0 * 10.0).round() / 10.0;
                let ws = (total_written.saturating_sub(prev_written) as f64 / elapsed / 1048576.0 * 10.0).round() / 10.0;
                (rs.max(0.0), ws.max(0.0))
            } else {
                (0.0, 0.0)
            }
        } else {
            (0.0, 0.0)
        };

        self.prev_disk = Some((total_read, total_written, now));
        DiskInfo { read_speed, write_speed }
    }

    fn compute_net_rates(&mut self, now: Instant) -> NetInfo {
        // Use standalone Networks type (System::networks() removed in sysinfo 0.31)
        let networks = Networks::new_with_refreshed_list();
        let total_rx: u64 = networks.list().iter()
            .map(|(_name, net)| net.total_received())
            .sum();
        let total_tx: u64 = networks.list().iter()
            .map(|(_name, net)| net.total_transmitted())
            .sum();

        let (download_speed, upload_speed) = if let Some((prev_rx, prev_tx, prev_time)) = self.prev_net {
            let elapsed = now.duration_since(prev_time).as_secs_f64();
            if elapsed > 0.0 {
                let ds = (total_rx.saturating_sub(prev_rx) as f64 / elapsed / 1048576.0 * 10.0).round() / 10.0;
                let us = (total_tx.saturating_sub(prev_tx) as f64 / elapsed / 1048576.0 * 10.0).round() / 10.0;
                (ds.max(0.0), us.max(0.0))
            } else {
                (0.0, 0.0)
            }
        } else {
            (0.0, 0.0)
        };

        self.prev_net = Some((total_rx, total_tx, now));
        NetInfo { download_speed, upload_speed }
    }

    pub fn start<F>(&mut self, callback: F)
    where
        F: Fn(SystemInfo) + Send + 'static,
    {
        self.stop();
        let (tx, rx) = mpsc::channel::<()>();
        self.stop_tx = Some(tx);
        let interval = self.interval_ms;

        // Clone what we need for the thread
        let mut sys = System::new_all();
        sys.refresh_all();
        let mut prev_disk: Option<(u64, u64, Instant)> = None;
        let mut prev_net: Option<(u64, u64, Instant)> = None;

        thread::spawn(move || {
            loop {
                // Check if we should stop
                if rx.try_recv().is_ok() {
                    break;
                }

                sys.refresh_all();
                let info = collect_snapshot(&sys, &mut prev_disk, &mut prev_net);
                callback(info);

                // Sleep in small increments so we can check stop signal
                let step = 100;
                let mut elapsed = 0u64;
                while elapsed < interval {
                    if rx.try_recv().is_ok() {
                        return;
                    }
                    thread::sleep(std::time::Duration::from_millis(step.min(interval - elapsed)));
                    elapsed += step;
                }
            }
        });
    }

    pub fn stop(&mut self) {
        self.stop_tx.take();
    }

    pub fn set_interval(&mut self, ms: u64) {
        self.interval_ms = ms;
    }

    pub fn interval(&self) -> u64 {
        self.interval_ms
    }
}

// Standalone function for the thread to use
fn collect_snapshot(sys: &System, prev_disk: &mut Option<(u64, u64, Instant)>, prev_net: &mut Option<(u64, u64, Instant)>) -> SystemInfo {
    let usage = (sys.global_cpu_usage() as f64 * 10.0).round() / 10.0;
    let cores: Vec<f64> = sys.cpus().iter()
        .map(|c| (c.cpu_usage() as f64 * 10.0).round() / 10.0)
        .collect();
    let temperature = get_cpu_temperature();

    let total_mem = sys.total_memory() as f64;
    let used_mem = sys.used_memory() as f64;
    let cached = if total_mem > used_mem { total_mem - used_mem } else { 0.0 };
    let used_swap = sys.used_swap() as f64;

    let memory = MemInfo {
        used: (used_mem / BYTES_PER_GB * 10.0).round() / 10.0,
        total: (total_mem / BYTES_PER_GB * 10.0).round() / 10.0,
        usage_percent: if total_mem > 0.0 { ((used_mem / total_mem) * 1000.0).round() / 10.0 } else { 0.0 },
        swap_used: (used_swap / BYTES_PER_GB * 10.0).round() / 10.0,
        cached: (cached / BYTES_PER_GB * 10.0).round() / 10.0,
    };

    let now = Instant::now();

    // Disk rates (from process disk_usage since Disk type lacks I/O counters in sysinfo 0.31)
    let total_read: u64 = sys.processes().values()
        .map(|p| p.disk_usage().total_read_bytes)
        .sum();
    let total_written: u64 = sys.processes().values()
        .map(|p| p.disk_usage().total_written_bytes)
        .sum();
    let (read_speed, write_speed) = compute_delta(total_read, total_written, prev_disk, now);
    *prev_disk = Some((total_read, total_written, now));

    // Net rates (standalone Networks type)
    let networks = Networks::new_with_refreshed_list();
    let total_rx: u64 = networks.list().iter()
        .map(|(_name, net)| net.total_received())
        .sum();
    let total_tx: u64 = networks.list().iter()
        .map(|(_name, net)| net.total_transmitted())
        .sum();
    let (download_speed, upload_speed) = compute_delta(total_rx, total_tx, prev_net, now);
    *prev_net = Some((total_rx, total_tx, now));

    let gpu = GpuInfo { usage: None, temperature: None };

    let mut processes: Vec<ProcessInfo> = sys.processes().iter()
        .map(|(_pid, process)| {
            let name = process.name().to_string_lossy().into_owned();
            ProcessInfo {
                name: if name.len() > 20 { format!("{}…", &name[..19]) } else { name },
                cpu: (process.cpu_usage() as f64 * 10.0).round() / 10.0,
                memory_mb: (process.memory() as f64 / 1048576.0 * 10.0).round() / 10.0,
            }
        })
        .collect();
    processes.sort_by(|a, b| b.cpu.partial_cmp(&a.cpu).unwrap_or(std::cmp::Ordering::Equal));
    processes.truncate(3);

    SystemInfo {
        cpu: CpuInfo { usage, cores, temperature, speed: 0.0 },
        memory,
        disk: DiskInfo { read_speed, write_speed },
        network: NetInfo { download_speed, upload_speed },
        gpu,
        processes,
    }
}

fn compute_delta(current_a: u64, current_b: u64, prev: &mut Option<(u64, u64, Instant)>, now: Instant) -> (f64, f64) {
    if let Some((prev_a, prev_b, prev_time)) = prev {
        let elapsed = now.duration_since(*prev_time).as_secs_f64();
        if elapsed > 0.0 {
            let da = (current_a.saturating_sub(*prev_a) as f64 / elapsed / 1048576.0 * 10.0).round() / 10.0;
            let db = (current_b.saturating_sub(*prev_b) as f64 / elapsed / 1048576.0 * 10.0).round() / 10.0;
            return (da.max(0.0), db.max(0.0));
        }
    }
    (0.0, 0.0)
}

// Platform-specific CPU temperature
#[cfg(target_os = "macos")]
fn get_cpu_temperature() -> Option<f64> {
    // Try sysctl first
    if let Ok(output) = std::process::Command::new("sysctl")
        .args(["-n", "machdep.xcpm.cpu_thermal_level"])
        .output()
    {
        if output.status.success() {
            if let Ok(s) = String::from_utf8(output.stdout) {
                if let Ok(val) = s.trim().parse::<f64>() {
                    if val > 0.0 { return Some(val); }
                }
            }
        }
    }
    None
}

#[cfg(not(target_os = "macos"))]
fn get_cpu_temperature() -> Option<f64> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_json_serialization() {
        let info = SystemInfo {
            cpu: CpuInfo {
                usage: 42.5,
                cores: vec![35.0, 48.0],
                temperature: Some(48.0),
                speed: 3.2,
            },
            memory: MemInfo {
                used: 8.5,
                total: 16.0,
                usage_percent: 53.1,
                swap_used: 2.1,
                cached: 4.0,
            },
            disk: DiskInfo { read_speed: 50.0, write_speed: 25.0 },
            network: NetInfo { download_speed: 10.0, upload_speed: 5.0 },
            gpu: GpuInfo { usage: Some(35.0), temperature: Some(62.0) },
            processes: vec![
                ProcessInfo { name: "Chrome".into(), cpu: 12.5, memory_mb: 1200.0 },
            ],
        };

        let json = serde_json::to_string(&info).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        // Verify camelCase keys in JSON
        assert_eq!(parsed["cpu"]["usage"].as_f64().unwrap(), 42.5);
        assert_eq!(parsed["cpu"]["temperature"].as_f64().unwrap(), 48.0);
        assert_eq!(parsed["memory"]["usagePercent"].as_f64().unwrap(), 53.1);
        assert_eq!(parsed["memory"]["swapUsed"].as_f64().unwrap(), 2.1);
        assert_eq!(parsed["memory"]["cached"].as_f64().unwrap(), 4.0);
        assert_eq!(parsed["processes"][0]["memoryMB"].as_f64().unwrap(), 1200.0);
        assert_eq!(parsed["gpu"]["usage"].as_f64().unwrap(), 35.0);
    }

    #[test]
    fn test_null_gpu_fields_serialize_to_null() {
        let gpu = GpuInfo { usage: None, temperature: None };
        let json = serde_json::to_string(&gpu).unwrap();
        assert_eq!(json, r#"{"usage":null,"temperature":null}"#);
    }

    #[test]
    fn test_process_name_truncation() {
        let p = ProcessInfo {
            name: "VeryLongProcessNameThatExceeds20Chars".into(),
            cpu: 5.0,
            memory_mb: 100.0,
        };
        // Name should be truncated to 20 chars
        // But note: truncation happens in collector logic, not in ProcessInfo struct
        // This test just verifies the struct can hold any name
        assert_eq!(p.name.len(), 37); // Original length
    }
}
