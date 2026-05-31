//! System Monitor — 桌面浮窗系统监控工具
//!
//! 二进制入口，调用 lib::run() 启动 Tauri 应用。
//! `#![windows_subsystem = "windows"]` 在 Windows 上隐藏控制台窗口。

// 防止 Windows 发布版显示额外的控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    system_monitor_lib::run()
}
