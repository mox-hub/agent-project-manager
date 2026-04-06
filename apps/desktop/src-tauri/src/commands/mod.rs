use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub version: String,
    pub tauri: String,
    pub rust: String,
    pub os: String,
    pub api_base_url: String,
    pub data_path: String,
    pub log_path: String,
    pub mode: String,
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        tauri: tauri::VERSION.to_string(),
        rust: rust_version::VERSION.to_string(),
        os: std::env::consts::OS.to_string(),
        api_base_url: String::new(),
        data_path: dirs::data_local_dir()
            .map(|p| p.join("com.agentpm.app").to_string_lossy().to_string())
            .unwrap_or_default(),
        log_path: dirs::data_local_dir()
            .map(|p| p.join("com.agentpm.app").join("logs").to_string_lossy().to_string())
            .unwrap_or_default(),
        mode: if cfg!(debug_assertions) {
            "development".to_string()
        } else {
            "production".to_string()
        },
    }
}

#[tauri::command]
pub async fn open_log_dir() -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;

    let log_path = dirs::data_local_dir()
        .map(|p| p.join("com.agentpm.app").join("logs"))
        .ok_or("无法获取日志目录路径")?;

    #[cfg(not(target_os = "windows"))]
    let path_str = log_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    let path_str = log_path.to_string_lossy().to_string();

    Ok(())
}
