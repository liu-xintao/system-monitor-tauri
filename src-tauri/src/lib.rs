// 系统监控 Tauri 后端入口
// 提供 mini 窗口（280×400）和系统信息采集能力

/// 启动 Tauri 应用
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
