//! 共享类型定义 — 系统监控数据模型
//!
//! 作为项目中 Rust ↔ TypeScript 的桥梁，所有结构体通过 serde 序列化为 camelCase JSON，
//! 与前端 `src/types.ts` 中的 TypeScript 接口一一对应。
//!
//! `#[serde(rename_all = "camelCase")]` 确保 Rust 的 snake_case 字段名在 JSON 中
//! 自动转为 camelCase，无需手动映射每个字段。

use serde::{Deserialize, Serialize};

/// CPU 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    /// 总体使用率 0-100，保留一位小数
    pub usage: f64,
    /// 每核使用率数组，长度 = 逻辑核心数
    pub cores: Vec<f64>,
    /// CPU 温度 °C，不可用（无传感器/权限不足）时为 null
    pub temperature: Option<f64>,
    /// 当前频率 GHz，sysinfo 不支持该字段，固定为 0
    pub speed: f64,
}

/// 内存信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemInfo {
    /// 已用内存 GB（= used_memory，排除 inactive+purgeable 页面）
    pub used: f64,
    /// 总内存 GB
    pub total: f64,
    /// 使用率 0-100，基于 used/total
    #[serde(rename = "usagePercent")]
    pub usage_percent: f64,
    /// 交换分区已用 GB
    #[serde(rename = "swapUsed")]
    pub swap_used: f64,
    /// 剩余内存 GB（= total - used，包含空闲 + 文件缓存）
    pub cached: f64,
}

/// 磁盘 IO 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    /// 读速率 MB/s（两次采样差值除以时间间隔）
    pub read_speed: f64,
    /// 写速率 MB/s
    pub write_speed: f64,
}

/// 网络 IO 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetInfo {
    /// 下载速率 MB/s（所有网络接口汇总）
    pub download_speed: f64,
    /// 上传速率 MB/s
    pub upload_speed: f64,
}

/// GPU 信息（macOS / 集显环境下均为 null）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    /// GPU 使用率 0-100，不可用时为 null
    pub usage: Option<f64>,
    /// GPU 温度 °C，不可用时为 null
    pub temperature: Option<f64>,
}

/// 进程信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    /// 进程名（>20 字符时截断并添加省略号）
    pub name: String,
    /// CPU 占用百分比
    pub cpu: f64,
    /// 物理内存占用 MB
    #[serde(rename = "memoryMB")]
    pub memory_mb: f64,
}

/// 系统信息 — 一次完整采集的全部数据
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub cpu: CpuInfo,
    pub memory: MemInfo,
    pub disk: DiskInfo,
    pub network: NetInfo,
    pub gpu: GpuInfo,
    /// CPU 占用 Top 3 进程
    pub processes: Vec<ProcessInfo>,
}
