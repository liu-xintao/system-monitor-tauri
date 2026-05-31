mod types;
mod collector;
mod commands;

use commands::CollectorState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let collector = collector::SystemInfoCollector::new(2000);

    tauri::Builder::default()
        .manage(CollectorState {
            collector: Mutex::new(collector),
            callback_active: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_refresh_interval,
            commands::set_always_on_top,
            commands::quit_app,
            commands::renderer_ready,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            // Show the window after setup (was created with visible: false)
            let _ = window.show();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
