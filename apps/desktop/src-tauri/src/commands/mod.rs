use crate::backend::{
    pick_backend_port, start_backend_process, stop_backend_process, wait_for_backend_health,
};
use crate::frontend::{start_frontend_process, stop_frontend_process};
use crate::setup;
use crate::state::{AppState, BackendInfo, BackendStatus, FrontendInfo, FrontendStatus};
use serde::Serialize;
use tauri::State;
use tracing::{error, info};

#[derive(Debug, Serialize)]
pub struct InitStatus {
    /// 最近一次初始化（db push 等）的错误；None = 正常
    pub error: Option<String>,
}

#[tauri::command]
pub async fn get_init_status(state: State<'_, AppState>) -> Result<InitStatus, String> {
    Ok(InitStatus {
        error: state.get_init_error(),
    })
}

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

    if let Some(err) = state.get_init_error() {
        return Err(format!("初始化未完成: {}", err));
    }

    let port = pick_backend_port(state.config.default_port, state.config.max_port).await?;

    let node_exe = setup::resolve_node(&state.config)?;
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

    let node_exe = setup::resolve_node(&state.config)?;

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
    let node_exe = setup::resolve_node(&state.config)?;

    // 启动前端：仅开发模式需要本地 vite dev server；生产模式前端随应用内嵌（webview 资源），无进程可启
    #[cfg(debug_assertions)]
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
    #[cfg(not(debug_assertions))]
    info!("[前端] 生产模式随应用内嵌，跳过开发服务器启动");

    // 启动后端
    if let Some(err) = state.get_init_error() {
        return Err(format!("初始化未完成: {}", err));
    }
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
    // 与启动时的后台初始化走同一条 setup 路径；失败写回 init_error 供 init 页展示
    let result = (|| -> Result<(), String> {
        setup::initialize_dirs(&state.config)?;
        setup::run_db_push_if_needed(&state.config)?;
        Ok(())
    })();

    match result {
        Ok(()) => {
            state.set_init_error(None);
            info!("应用初始化完成");
            Ok(())
        }
        Err(e) => {
            error!("应用初始化失败: {}", e);
            state.set_init_error(Some(e.clone()));
            Err(e)
        }
    }
}
