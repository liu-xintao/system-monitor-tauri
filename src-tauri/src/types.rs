use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub usage: f64,
    pub cores: Vec<f64>,
    pub temperature: Option<f64>,
    pub speed: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemInfo {
    pub used: f64,
    pub total: f64,
    #[serde(rename = "usagePercent")]
    pub usage_percent: f64,
    #[serde(rename = "swapUsed")]
    pub swap_used: f64,
    pub cached: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub read_speed: f64,
    pub write_speed: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetInfo {
    pub download_speed: f64,
    pub upload_speed: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub usage: Option<f64>,
    pub temperature: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub name: String,
    pub cpu: f64,
    #[serde(rename = "memoryMB")]
    pub memory_mb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub cpu: CpuInfo,
    pub memory: MemInfo,
    pub disk: DiskInfo,
    pub network: NetInfo,
    pub gpu: GpuInfo,
    pub processes: Vec<ProcessInfo>,
}
