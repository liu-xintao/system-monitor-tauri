/**
 * 类型定义（Tauri 版本）
 *
 * 这些接口与 Rust 后端通过 serde 序列化的 SystemInfo 结构体对应。
 * 前端通过 @tauri-apps/api/event 的 listen<SystemInfo>() 接收。
 */

/** CPU 信息 */
export interface CpuInfo {
  /** CPU 总体使用率（0~100，一位小数） */
  readonly usage: number;
  /** 每个逻辑核心的使用率数组 */
  readonly cores: readonly number[];
  /** CPU 温度（°C），不可用时为 null */
  readonly temperature: number | null;
  /** CPU 当前频率（GHz），不可用时为 0 */
  readonly speed: number;
}

/** 内存信息 */
export interface MemInfo {
  /** 真实已用内存 GB（= active，不包含系统缓存） */
  readonly used: number;
  /** 总内存 GB */
  readonly total: number;
  /** 内存使用百分比 0-100 */
  readonly usagePercent: number;
  /** 交换分区已用 GB */
  readonly swapUsed: number;
  /** 文件缓存 + 缓冲区 GB */
  readonly cached: number;
}

/** 磁盘 IO 速率 */
export interface DiskInfo {
  /** 读取速率（MB/s） */
  readonly readSpeed: number;
  /** 写入速率（MB/s） */
  readonly writeSpeed: number;
}

/** 网络 IO 速率 */
export interface NetInfo {
  /** 下载速率（MB/s） */
  readonly downloadSpeed: number;
  /** 上传速率（MB/s） */
  readonly uploadSpeed: number;
}

/** GPU 信息 */
export interface GpuInfo {
  /** GPU 使用率百分比，不可用时为 null */
  readonly usage: number | null;
  /** GPU 温度（°C），不可用时为 null */
  readonly temperature: number | null;
}

/** 进程快照信息 */
export interface ProcessInfo {
  /** 进程名称 */
  readonly name: string;
  /** CPU 占用率百分比 */
  readonly cpu: number;
  /** 物理内存使用量（MB） */
  readonly memoryMB: number;
}

/** 系统信息综合快照 */
export interface SystemInfo {
  readonly cpu: CpuInfo;
  readonly memory: MemInfo;
  readonly disk: DiskInfo;
  readonly network: NetInfo;
  readonly gpu: GpuInfo;
  /** CPU 占用率最高的前 3 个进程 */
  readonly processes: readonly ProcessInfo[];
}
