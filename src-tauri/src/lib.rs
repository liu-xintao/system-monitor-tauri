//! System Monitor Tauri — 桌面浮窗系统监控工具
//!
//! 注册所有 Tauri 命令、管理全局状态、配置应用启动行为。
//!
//! 架构：
//!   Collector (独立线程) → emit("system-info") → 前端 listen → React 渲染
//!
//! 与 Electron 版的对应关系：
//!   - lib.rs + main.rs ≈ src/main/index.ts（主进程入口）
//!   - commands.rs ≈ ipcMain.on(...) 处理器
//!   - collector.rs ≈ SystemInfoCollector 类
//!   - 前端 invoke("xxx") ≈ window.electronAPI.xxx()
//!   - 前端 listen("system-info") ≈ window.electronAPI.onSystemInfo(cb)

mod types;
mod collector;
mod commands;

use commands::CollectorState;
use std::sync::Mutex;
use tauri::Manager;

/// 应用入口（由 main.rs 调用）
///
/// 窗口配置在 tauri.conf.json 中定义：无边框、置顶、透明、280×400。
/// 窗口初始 visible: false，setup 完成后才显示，避免白屏闪烁。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 创建采集器，默认 2 秒轮询间隔
    let collector = collector::SystemInfoCollector::new(2000);

    tauri::Builder::default()
        // 注入采集器全局状态（跨命令共享，Mutex 保护）
        .manage(CollectorState {
            collector: Mutex::new(collector),
            callback_active: Mutex::new(false),
        })
        // 注册所有 IPC 命令（前端通过 invoke("xxx") 调用）
        .invoke_handler(tauri::generate_handler![
            commands::set_refresh_interval,
            commands::set_always_on_top,
            commands::quit_app,
            commands::renderer_ready,
        ])
        // 启动完成后显示窗口
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let _ = window.show();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
