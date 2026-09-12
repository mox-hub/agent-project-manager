mod backend;
mod commands;
mod config;
mod frontend;
mod setup;
mod state;
mod unified_logging;

use config::AppConfig;
use state::AppState;
use std::path::PathBuf;
use tauri::{Manager, RunEvent};
use tauri_plugin_log::{Target, TargetKind};
use tracing::{error, info};

fn resolve_workspace_root() -> PathBuf {
    // Debug: use CARGO_MANIFEST_DIR (apps/desktop/src-tauri) → workspace root
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent() // src-tauri
        .expect("expected src-tauri dir")
        .parent() // apps/desktop
        .expect("expected desktop dir")
        .parent() // apps
        .expect("expected apps dir")
        .to_path_buf()
}

fn create_app_config() -> AppConfig {
    let mut config = AppConfig::new();

    #[cfg(debug_assertions)]
    {
        let root = resolve_workspace_root();
        config.server_cwd = root.join("apps").join("server");
        config.frontend_dist = root.join("apps").join("frontend").join("dist");
        // node_exe = None → setup::resolve_node 回落 PATH 上的 node
    }

    #[cfg(not(debug_assertions))]
    {
        // Release：全部运行时资产随包分发，位于安装目录 target/desktop-pack/ 下
        //（NSIS 的资源目录 = exe 所在目录；资源按其相对 src-tauri 的路径原样落位）。
        let exe_dir = std::env::current_exe()
            .expect("failed to get exe path")
            .parent()
            .expect("exe has no parent dir")
            .to_path_buf();
        let pack = exe_dir.join("target").join("desktop-pack");
        config.server_cwd = pack.join("server");
        config.frontend_dist = pack.join("frontend");
        config.node_exe = Some(
            pack.join("bin")
                .join(if cfg!(windows) { "node.exe" } else { "node" }),
        );
    }

    // SWC builder 以 src 为 rootDir 平铺输出，入口是 dist/main.js（非旧的 dist/src/main.js）
    config.server_entry = config.server_cwd.join("dist").join("main.js");

    config
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut config = create_app_config();

    // 目录与密钥同步就绪（毫秒级）——服务启动与 db push 都依赖它们，不能与后台初始化竞态。
    if let Err(e) = setup::initialize_dirs(&config) {
        error!("{}", e);
    }
    if let Err(e) = setup::ensure_secrets(&mut config) {
        error!("{}", e);
    }

    let init_config = config.clone();
    let app_state = AppState::with_config(config);

    let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };

    // Prisma 建库放后台（秒级），失败经 AppState.init_error 透出到前端 init 页
    {
        let app_state = app_state.clone();
        std::thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                match setup::run_db_push_if_needed(&init_config) {
                    Ok(created) => {
                        app_state.set_init_error(None);
                        if created {
                            info!("应用初始化完成（新库已创建）");
                        } else {
                            info!("应用初始化完成");
                        }
                    }
                    Err(e) => {
                        error!("应用初始化失败: {}", e);
                        app_state.set_init_error(Some(e));
                    }
                }
            });
        });
    }

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
            commands::get_init_status,
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
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            // 退出时杀掉托管子进程，避免 node 后端在任务管理器残留
            if let RunEvent::Exit = event {
                let state = _app_handle.state::<AppState>();
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    let mut bg = state.backend_process.write().await;
                    let _ = backend::stop_backend_process(&mut bg);
                    let mut fg = state.frontend_process.write().await;
                    let _ = frontend::stop_frontend_process(&mut fg);
                });
                info!("子进程已清理，应用退出");
            }
        });
}
