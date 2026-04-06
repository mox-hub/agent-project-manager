use serde::Serialize;
use tauri::Manager;

mod commands;

#[derive(Debug, Serialize)]
pub struct DesktopAppInfo {
    pub version: String,
    pub tauri: String,
    pub rust: String,
    pub os: String,
    pub api_base_url: String,
    pub data_path: String,
    pub log_path: String,
    pub mode: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    tracing::info!("Starting Agent Project Manager Desktop (Tauri)");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::open_log_dir,
        ])
        .setup(|app| {
            tracing::info!("Tauri desktop setup complete");

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
