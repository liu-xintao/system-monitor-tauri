//! Tauri 命令模块 — 处理来自前端的 IPC 调用
//!
//! 每个 `#[tauri::command]` 函数对应前端 `invoke("xxx", { ... })` 调用。
//! 命令通过 Tauri 的 State 管理共享的 SystemInfoCollector 实例。
//!
//! 对应 Electron 版 `src/main/index.ts` 中的 `ipcMain.on(...)` 处理器。

use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use crate::collector::SystemInfoCollector;

/// 采集器全局状态，由 Tauri 的 `.manage()` 注入
pub struct CollectorState {
    /// 系统信息采集器（互斥锁保护，跨线程安全）
    pub collector: Mutex<SystemInfoCollector>,
    /// 是否已启动采集回调（防止重复注册）
    pub callback_active: Mutex<bool>,
}

/// 修改刷新频率
///
/// 前端调用：`invoke("set_refresh_interval", { ms: 1000 })`
/// 参数 ms 必须在 100~60000 之间（0.1s ~ 60s）
#[tauri::command]
pub fn set_refresh_interval(
    app: AppHandle,
    state: State<CollectorState>,
    ms: u64,
) -> Result<(), String> {
    if ms < 100 || ms > 60000 {
        return Err("Interval must be between 100ms and 60000ms".into());
    }
    let mut collector = state.collector.lock().map_err(|e| e.to_string())?;
    collector.set_interval(ms);
    let app_handle = app.clone();
    collector.start(move |info| {
        let _ = app_handle.emit("system-info", info);
    });
    Ok(())
}

/// 切换窗口置顶
///
/// 前端调用：`invoke("set_always_on_top", { on: true })`
#[tauri::command]
pub fn set_always_on_top(app: AppHandle, on: bool) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("Window not found")?
        .set_always_on_top(on)
        .map_err(|e| e.to_string())
}

/// 退出应用
///
/// 前端调用：`invoke("quit_app")`
#[tauri::command]
pub fn quit_app() {
    std::process::exit(0);
}

/// 渲染器就绪信号
///
/// 前端调用：`invoke("renderer_ready")`
/// 收到后启动采集器开始推送数据。
/// 使用 callback_active 标志防止重复启动（React StrictMode 会双重挂载）。
///
/// 与 Electron 版 `ipcMain.once('renderer-ready', ...)` 等价。
#[tauri::command]
pub fn renderer_ready(app: AppHandle, state: State<CollectorState>) -> Result<(), String> {
    let was_active = {
        let active = state.callback_active.lock().map_err(|e| e.to_string())?;
        *active
    };
    if was_active {
        return Ok(());
    }

    {
        let mut active = state.callback_active.lock().map_err(|e| e.to_string())?;
        *active = true;
    }

    let mut collector = state.collector.lock().map_err(|e| e.to_string())?;
    let app_handle = app.clone();
    collector.start(move |info| {
        let _ = app_handle.emit("system-info", info);
    });
    Ok(())
}
