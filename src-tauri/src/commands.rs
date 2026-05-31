use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use crate::collector::SystemInfoCollector;

pub struct CollectorState {
    pub collector: Mutex<SystemInfoCollector>,
    pub callback_active: Mutex<bool>,
}

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

#[tauri::command]
pub fn set_always_on_top(app: AppHandle, on: bool) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("Window not found")?
        .set_always_on_top(on)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quit_app() {
    std::process::exit(0);
}

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
