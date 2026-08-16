use crate::config::AppConfig;
use crate::unified_logging::spawn_log_redirector;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use tracing::info;

const FRONTEND_PORT: u16 = 5173;

pub struct FrontendProcess {
    pub child: Child,
    pub port: u16,
    pub url: String,
}

pub fn start_frontend_process(
    node_exe: &Path,
    _config: &AppConfig,
) -> Result<FrontendProcess, String> {
    let frontend_root = Path::new("E:/Project/agent-project-manager/apps/frontend");
    let port = FRONTEND_PORT;
    let url = format!("http://localhost:{}", port);

    // 检查端口是否已被占用
    if is_port_in_use(port) {
        info!("前端端口 {} 已被占用，使用现有服务", port);
        let child = Command::new("echo")
            .arg("frontend-managed-externally")
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(FrontendProcess { child, port, url });
    }

    info!(
        "启动前端开发服务器: port={}, root={}",
        port,
        frontend_root.display()
    );

    // 使用 PowerShell 在 Windows 上启动子进程
    #[cfg(windows)]
    let mut child = {
        let mut cmd = Command::new("powershell");
        cmd.args([
            "-NoProfile",
            "-Command",
            &format!("cd '{}'; pnpm dev", frontend_root.display()),
        ])
        .current_dir(frontend_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动前端进程失败: {}", e))?
    };

    #[cfg(not(windows))]
    let child = {
        let mut cmd = Command::new("pnpm");
        cmd.args(["dev"])
            .current_dir(frontend_root)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("启动前端进程失败: {}", e))?
    };

    // 启动日志重定向线程
    if let Some(stdout) = child.stdout.take() {
        spawn_log_redirector("frontend:stdout", Box::new(stdout));
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_log_redirector("frontend:stderr", Box::new(stderr));
    }

    // 等待前端服务就绪
    if let Err(e) = wait_for_frontend_ready(port) {
        let _ = child.kill();
        return Err(format!("前端服务启动失败: {}", e));
    }

    info!("前端开发服务器启动成功: {}", url);

    Ok(FrontendProcess { child, port, url })
}

fn is_port_in_use(port: u16) -> bool {
    use std::net::TcpStream;
    let addr = format!("127.0.0.1:{}", port);
    TcpStream::connect_timeout(
        &addr.parse().unwrap(),
        std::time::Duration::from_millis(100),
    )
    .is_ok()
}

fn wait_for_frontend_ready(port: u16) -> Result<(), String> {
    use std::net::TcpStream;
    use std::io::{Read, Write};

    for i in 0..60 {
        let addr = format!("127.0.0.1:{}", port);
        if TcpStream::connect_timeout(
            &addr.parse().unwrap(),
            std::time::Duration::from_millis(200),
        )
        .is_ok()
        {
            if let Ok(mut stream) = TcpStream::connect_timeout(
                &addr.parse().unwrap(),
                std::time::Duration::from_secs(2),
            ) {
                let request = "GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n";
                if stream.write_all(request.as_bytes()).is_ok() {
                    let mut buf = [0u8; 100];
                    if stream.read(&mut buf).is_ok() {
                        info!("前端服务就绪 (端口 {})", port);
                        return Ok(());
                    }
                }
            }
        }

        if i % 10 == 0 {
            info!("等待前端服务启动... ({}/60)", i + 1);
        }

        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    Err("前端服务启动超时".to_string())
}

pub fn stop_frontend_process(child: &mut Option<Child>) -> Result<(), String> {
    if let Some(ref mut proc) = child {
        info!("正在关闭前端进程...");
        let _ = proc.kill();
        if let Ok(exit) = proc.wait() {
            info!("前端进程已退出: exit_code={}", exit.code().unwrap_or(-1));
        }
        *child = None;
    }
    Ok(())
}
