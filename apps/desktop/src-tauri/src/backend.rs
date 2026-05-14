use crate::config::AppConfig;
use crate::unified_logging::spawn_log_redirector;
use std::net::TcpStream;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::time::Duration;
use tracing::info;

const HEALTH_CHECK_TIMEOUT_MS: u64 = 30_000;
const HEALTH_CHECK_POLL_MS: u64 = 500;

pub fn is_port_available(port: u16) -> bool {
    let addr = format!("127.0.0.1:{}", port);
    TcpStream::connect_timeout(&addr.parse().unwrap(), Duration::from_millis(100)).is_err()
}

pub async fn pick_backend_port(start: u16, end: u16) -> Result<u16, String> {
    for port in start..=end {
        if is_port_available(port) {
            return Ok(port);
        }
    }
    Err(format!("无法分配后端端口（范围 {}-{}）", start, end))
}

fn check_http_health(host: &str, port: u16) -> bool {
    use std::io::{Read, Write};
    let addr = format!("{}:{}", host, port);
    if let Ok(mut stream) = TcpStream::connect_timeout(
        &addr.parse().unwrap(),
        Duration::from_secs(2),
    ) {
        let request = format!("GET /_api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n");
        if stream.write_all(request.as_bytes()).is_ok() {
            let mut buf = [0u8; 12];
            return stream.read(&mut buf).is_ok();
        }
    }
    false
}

pub async fn wait_for_backend_health(api_base_url: &str) -> Result<(), String> {
    let started_at = std::time::Instant::now();
    let url_cleaned = api_base_url.replace("http://", "");
    let url_parts: Vec<&str> = url_cleaned.split(':').collect();
    let host = url_parts.get(0).unwrap_or(&"127.0.0.1");
    let port: u16 = url_parts
        .get(1)
        .and_then(|p| p.parse().ok())
        .unwrap_or(4300);

    while started_at.elapsed().as_millis() < HEALTH_CHECK_TIMEOUT_MS as u128 {
        if check_http_health(host, port) {
            info!("后端健康检查通过: {}", api_base_url);
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(HEALTH_CHECK_POLL_MS)).await;
    }

    Err("后端健康检查超时".to_string())
}

pub fn start_backend_process(
    node_exe: &Path,
    server_entry: &Path,
    port: u16,
    config: &AppConfig,
) -> Result<Child, String> {
    let allowed_origins = format!(
        "http://127.0.0.1:{},http://localhost:{}",
        port, port
    );

    info!(
        "启动后端: port={}, entry={}, cwd={}",
        port,
        server_entry.display(),
        config.server_cwd.display()
    );

    let mut child = Command::new(node_exe)
        .arg(server_entry)
        .current_dir(&config.server_cwd)
        .env("PORT", port.to_string())
        .env("DATABASE_URL", config.get_database_url())
        .env("JWT_SECRET", &config.jwt_secret)
        .env("FRONTEND_DIST_DIR", config.frontend_dist.to_string_lossy().as_ref())
        .env("UPLOAD_DIR", config.upload_dir.to_string_lossy().as_ref())
        .env("INTEGRATION_ENCRYPTION_KEY", &config.integration_key)
        .env("ALLOWED_ORIGINS", allowed_origins)
        .env("PRISMA_CLIENT_ENGINE_TYPE", "library")
        .env("NODE_ENV", "production")
        .env("APP_MODE", "standalone")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动后端进程失败: {}", e))?;

    // 启动日志重定向线程
    if let Some(stdout) = child.stdout.take() {
        spawn_log_redirector("backend:stdout", Box::new(stdout));
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_log_redirector("backend:stderr", Box::new(stderr));
    }

    Ok(child)
}

pub fn stop_backend_process(child: &mut Option<Child>) -> Result<(), String> {
    if let Some(ref mut proc) = child {
        info!("正在关闭后端进程...");
        let _ = proc.kill();
        if let Ok(exit) = proc.wait() {
            info!("后端进程已退出: exit_code={}", exit.code().unwrap_or(-1));
        }
        *child = None;
    }
    Ok(())
}
