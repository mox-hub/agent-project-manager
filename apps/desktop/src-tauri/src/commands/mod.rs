use crate::backend::{
    pick_backend_port, start_backend_process, stop_backend_process, wait_for_backend_health,
};
use crate::frontend::{start_frontend_process, stop_frontend_process};
use crate::state::{AppState, BackendInfo, BackendStatus, FrontendInfo, FrontendStatus};
use serde::Serialize;
use std::process::Command;
use tauri::State;
use tracing::{error, info};

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub version: String,
    pub tauri: String,
    pub rust: String,
    pub os: String,
    pub api_base_url: String,
    pub frontend_url: String,
    pub data_path: String,
    pub log_path: String,
    pub mode: String,
}

#[tauri::command]
pub fn get_app_info(state: State<'_, AppState>) -> AppInfo {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let backend_url = rt.block_on(async {
        state
            .backend_info
            .try_read()
            .ok()
            .and_then(|guard| guard.clone())
            .map(|i| i.api_base_url)
            .unwrap_or_default()
    });

    let frontend_url = rt.block_on(async {
        state
            .frontend_info
            .try_read()
            .ok()
            .and_then(|guard| guard.clone())
            .map(|i| i.url)
            .unwrap_or_default()
    });

    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        tauri: tauri::VERSION.to_string(),
        rust: rustc_version::version()
            .map(|v| v.to_string())
            .unwrap_or_else(|_| "unknown".to_string()),
        os: std::env::consts::OS.to_string(),
        api_base_url: backend_url,
        frontend_url,
        data_path: dirs::data_local_dir()
            .map(|p| p.join("com.agentpm.desktop").to_string_lossy().to_string())
            .unwrap_or_default(),
        log_path: dirs::data_local_dir()
            .map(|p| p.join("com.agentpm.desktop").join("logs").to_string_lossy().to_string())
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
    let log_path = dirs::data_local_dir()
        .map(|p| p.join("com.agentpm.desktop").join("logs"))
        .ok_or("无法获取日志目录路径")?;

    if !log_path.exists() {
        std::fs::create_dir_all(&log_path)
            .map_err(|e| format!("创建日志目录失败: {}", e))?;
    }

    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("打开日志目录失败: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("打开日志目录失败: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("打开日志目录失败: {}", e))?;
    }

    info!("已打开日志目录: {}", log_path.display());
    Ok(())
}

#[tauri::command]
pub async fn get_backend_status(state: State<'_, AppState>) -> Result<BackendStatus, String> {
    Ok(state.get_backend_status().await)
}

#[tauri::command]
pub async fn get_frontend_status(state: State<'_, AppState>) -> Result<FrontendStatus, String> {
    Ok(state.get_frontend_status().await)
}

#[tauri::command]
pub async fn start_backend(state: State<'_, AppState>) -> Result<BackendInfo, String> {
    if state.get_backend_info().await.is_some() {
        return Err("后端已在运行".to_string());
    }

    let port = pick_backend_port(state.config.default_port, state.config.max_port).await?;

    let node_exe = std::env::current_exe()
        .map_err(|e| format!("获取 Node.exe 路径失败: {}", e))?
        .parent()
        .ok_or("无法获取 Node.exe 父目录")?
        .join(if cfg!(windows) { "node.exe" } else { "node" });

    if !node_exe.exists() {
        return Err("未找到 Node.js 可执行文件".to_string());
    }

    let (server_entry, server_cwd, _) = state.resolve_runtime_assets();

    if !server_entry.exists() {
        return Err(format!("未找到后端入口文件: {}", server_entry.display()));
    }

    let mut config = state.config.clone();
    config.server_cwd = server_cwd;

    let mut child = start_backend_process(&node_exe, &server_entry, port, &config)?;

    let api_base_url = format!("http://127.0.0.1:{}", port);

    if let Err(e) = wait_for_backend_health(&api_base_url).await {
        let _ = child.kill();
        return Err(format!("后端启动失败: {}", e));
    }

    let pid = child.id();
    let info = BackendInfo {
        port,
        api_base_url: api_base_url.clone(),
        pid,
    };

    state.set_backend(child, info.clone()).await;
    info!("后端启动成功: {}", api_base_url);
    Ok(info)
}

#[tauri::command]
pub async fn stop_backend(state: State<'_, AppState>) -> Result<(), String> {
    let mut process_guard = state.backend_process.write().await;
    stop_backend_process(&mut process_guard)?;
    drop(process_guard);
    state.clear_backend().await;
    Ok(())
}

#[tauri::command]
pub async fn restart_backend(state: State<'_, AppState>) -> Result<BackendInfo, String> {
    {
        let mut process_guard = state.backend_process.write().await;
        stop_backend_process(&mut process_guard)?;
    }
    state.clear_backend().await;
    start_backend(state).await
}

#[tauri::command]
pub async fn start_frontend(state: State<'_, AppState>) -> Result<FrontendInfo, String> {
    if state.get_frontend_info().await.is_some() {
        return Err("前端已在运行".to_string());
    }

    let node_exe = std::env::current_exe()
        .map_err(|e| format!("获取 Node.exe 路径失败: {}", e))?
        .parent()
        .ok_or("无法获取 Node.exe 父目录")?
        .join(if cfg!(windows) { "node.exe" } else { "node" });

    if !node_exe.exists() {
        return Err("未找到 Node.js 可执行文件".to_string());
    }

    match start_frontend_process(&node_exe, &state.config) {
        Ok(frontend) => {
            let pid = frontend.child.id();
            let info = FrontendInfo {
                port: frontend.port,
                url: frontend.url.clone(),
                pid,
            };
            state.set_frontend(frontend.child, info.clone()).await;
            info!("前端启动成功: {} (PID: {})", frontend.url, pid);
            Ok(info)
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn stop_frontend(state: State<'_, AppState>) -> Result<(), String> {
    let mut process_guard = state.frontend_process.write().await;
    stop_frontend_process(&mut process_guard)?;
    drop(process_guard);
    state.clear_frontend().await;
    Ok(())
}

#[tauri::command]
pub async fn start_all_services(state: State<'_, AppState>) -> Result<(), String> {
    let node_exe = std::env::current_exe()
        .map_err(|e| format!("获取 Node.exe 路径失败: {}", e))?
        .parent()
        .ok_or("无法获取 Node.exe 父目录")?
        .join(if cfg!(windows) { "node.exe" } else { "node" });

    if !node_exe.exists() {
        return Err("未找到 Node.js 可执行文件".to_string());
    }

    // 启动前端
    match start_frontend_process(&node_exe, &state.config) {
        Ok(frontend) => {
            let info = FrontendInfo {
                port: frontend.port,
                url: frontend.url.clone(),
                pid: frontend.child.id(),
            };
            state.set_frontend(frontend.child, info).await;
            info!("[前端] 启动成功: {}", frontend.url);
        }
        Err(e) => {
            error!("[前端] 启动失败: {}", e);
        }
    }

    // 启动后端
    let (server_entry, server_cwd, _) = state.resolve_runtime_assets();
    if !server_entry.exists() {
        return Err(format!("未找到后端入口文件: {}", server_entry.display()));
    }

    let port = pick_backend_port(state.config.default_port, state.config.max_port)
        .await?;

    let mut config = state.config.clone();
    config.server_cwd = server_cwd;

    match start_backend_process(&node_exe, &server_entry, port, &config) {
        Ok(mut child) => {
            let api_base_url = format!("http://127.0.0.1:{}", port);
            if let Err(e) = wait_for_backend_health(&api_base_url).await {
                let _ = child.kill();
                error!("[后端] 启动失败: {}", e);
            } else {
                let pid = child.id();
                let info = BackendInfo {
                    port,
                    api_base_url: api_base_url.clone(),
                    pid,
                };
                state.set_backend(child, info).await;
                info!("[后端] 启动成功: {}", api_base_url);
            }
        }
        Err(e) => {
            error!("[后端] 启动失败: {}", e);
        }
    }

    info!("所有服务启动完成");
    Ok(())
}

#[tauri::command]
pub async fn stop_all_services(state: State<'_, AppState>) -> Result<(), String> {
    {
        let mut process_guard = state.backend_process.write().await;
        stop_backend_process(&mut process_guard)?;
        state.clear_backend().await;
    }

    {
        let mut process_guard = state.frontend_process.write().await;
        stop_frontend_process(&mut process_guard)?;
        state.clear_frontend().await;
    }

    info!("所有服务已停止");
    Ok(())
}

#[tauri::command]
pub async fn init_app(state: State<'_, AppState>) -> Result<(), String> {
    let user_data_dir = &state.config.user_data_dir;
    let logs_dir = &state.config.logs_dir;
    let upload_dir = &state.config.upload_dir;

    for dir in [user_data_dir, logs_dir, upload_dir] {
        if !dir.exists() {
            std::fs::create_dir_all(dir)
                .map_err(|e| format!("创建目录失败 {}: {}", dir.display(), e))?;
        }
    }

    let prisma_schema = state.config.server_cwd.join("prisma").join("schema.prisma");

    if prisma_schema.exists() {
        let node_exe = std::env::current_exe()
            .map_err(|e| format!("获取 Node.exe 路径失败: {}", e))?
            .parent()
            .ok_or("无法获取 Node.exe 父目录")?
            .join(if cfg!(windows) { "node.exe" } else { "node" });

        let prisma_entry = state
            .config
            .server_cwd
            .join("node_modules")
            .join("prisma")
            .join("build")
            .join("index.js");

        if node_exe.exists() && prisma_entry.exists() {
            info!("运行 Prisma db push...");
            let output = Command::new(&node_exe)
                .arg(&prisma_entry)
                .args([
                    "db",
                    "push",
                    "--schema",
                    &prisma_schema.to_string_lossy(),
                    "--skip-generate",
                    "--accept-data-loss",
                ])
                .env("DATABASE_URL", state.config.get_database_url())
                .env("PRISMA_CLIENT_ENGINE_TYPE", "library")
                .output()
                .map_err(|e| format!("执行 Prisma 失败: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                error!("Prisma 错误: {}", stderr);
            } else {
                info!("Prisma db push 完成");
            }
        }
    }

    info!("应用初始化完成");
    Ok(())
}
