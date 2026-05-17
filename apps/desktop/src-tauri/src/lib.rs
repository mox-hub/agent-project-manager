mod backend;
mod commands;
mod config;
mod frontend;
mod state;
mod unified_logging;

use backend::{start_backend_process, wait_for_backend_health};
use config::AppConfig;
use frontend::start_frontend_process;
use state::{AppState, BackendInfo, FrontendInfo};
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};
use tracing::{error, info};

fn create_app_config() -> AppConfig {
    let mut config = AppConfig::new();

    #[cfg(debug_assertions)]
    {
        config.server_cwd = PathBuf::from("E:/Project/agent-project-manager/apps/server");
        config.frontend_dist = PathBuf::from("E:/Project/agent-project-manager/apps/frontend/dist");
    }

    #[cfg(not(debug_assertions))]
    {
        if let Ok(resource_path) = std::env::var("RESOURCE_PATH") {
            config.server_cwd = PathBuf::from(&resource_path).join("server");
            config.frontend_dist = PathBuf::from(&resource_path).join("frontend");
        }
    }

    config.server_entry = config
        .server_cwd
        .join("dist")
        .join("src")
        .join("main.js");

    config
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = create_app_config();
    let server_cwd = config.server_cwd.clone();
    let init_config = create_app_config();

    let app_state = AppState::with_config(config);

    let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };

    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            if let Err(e) = initialize_app(&server_cwd, &init_config).await {
                error!("应用初始化失败: {}", e);
            } else {
                info!("应用初始化完成，准备就绪");
            }
        });
    });

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .level(log_level)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .manage(app_state.clone())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::open_log_dir,
            commands::get_backend_status,
            commands::get_frontend_status,
            commands::start_backend,
            commands::stop_backend,
            commands::restart_backend,
            commands::start_frontend,
            commands::stop_frontend,
            commands::init_app,
            commands::start_all_services,
            commands::stop_all_services,
        ])
        .setup(move |app| {
            info!("Tauri desktop setup complete");

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

async fn initialize_app(
    server_cwd: &std::path::Path,
    config: &AppConfig,
) -> Result<(), String> {
    info!("开始应用初始化...");

    for dir in [&config.user_data_dir, &config.logs_dir, &config.upload_dir] {
        if !dir.exists() {
            std::fs::create_dir_all(dir)
                .map_err(|e| format!("创建目录失败 {}: {}", dir.display(), e))?;
        }
    }

    let prisma_schema = server_cwd.join("prisma").join("schema.prisma");

    if prisma_schema.exists() {
        let node_exe = std::env::current_exe()
            .map_err(|e| format!("获取 Node.exe 路径失败: {}", e))?
            .parent()
            .ok_or("无法获取 Node.exe 父目录")?
            .join(if cfg!(windows) { "node.exe" } else { "node" });

        let prisma_entry = server_cwd
            .join("node_modules")
            .join("prisma")
            .join("build")
            .join("index.js");

        if node_exe.exists() && prisma_entry.exists() {
            info!("运行 Prisma db push...");
            let output = std::process::Command::new(&node_exe)
                .arg(&prisma_entry)
                .args([
                    "db",
                    "push",
                    "--schema",
                    &prisma_schema.to_string_lossy(),
                    "--skip-generate",
                    "--accept-data-loss",
                ])
                .env("DATABASE_URL", config.get_database_url())
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

async fn start_all_services(state: &AppState) -> Result<(), String> {
    info!("========== 开始启动所有服务 ==========");

    let node_exe = std::env::current_exe()
        .map_err(|e| format!("获取 Node.exe 路径失败: {}", e))?
        .parent()
        .ok_or("无法获取 Node.exe 父目录")?
        .join(if cfg!(windows) { "node.exe" } else { "node" });

    if !node_exe.exists() {
        return Err("未找到 Node.js 可执行文件".to_string());
    }

    info!("[启动服务] 前端开发服务器...");
    match start_frontend_process(&node_exe, &state.config) {
        Ok(frontend) => {
            let pid = frontend.child.id();
            let info = FrontendInfo {
                port: frontend.port,
                url: frontend.url.clone(),
                pid,
            };
            state.set_frontend(frontend.child, info).await;
            info!("[启动成功] 前端服务: {} (PID: {})", frontend.url, pid);
        }
        Err(e) => {
            error!("[启动失败] 前端服务: {}", e);
        }
    }

    info!("[启动服务] 后端服务...");
    let (server_entry, server_cwd, _) = state.resolve_runtime_assets();

    if !server_entry.exists() {
        return Err(format!("未找到后端入口文件: {}", server_entry.display()));
    }

    let port = backend::pick_backend_port(state.config.default_port, state.config.max_port)
        .await?;

    let mut config = state.config.clone();
    config.server_cwd = server_cwd;

    match start_backend_process(&node_exe, &server_entry, port, &config) {
        Ok(mut child) => {
            let api_base_url = format!("http://127.0.0.1:{}", port);

            info!("[启动服务] 等待后端健康检查...");
            if let Err(e) = wait_for_backend_health(&api_base_url).await {
                let _ = child.kill();
                error!("[启动失败] 后端服务: {}", e);
            } else {
                let pid = child.id();
                let info = BackendInfo {
                    port,
                    api_base_url: api_base_url.clone(),
                    pid,
                };
                state.set_backend(child, info).await;
                info!("[启动成功] 后端服务: {} (PID: {})", api_base_url, pid);
            }
        }
        Err(e) => {
            error!("[启动失败] 后端服务: {}", e);
        }
    }

    info!("========== 所有服务启动完成 ==========");
    Ok(())
}
