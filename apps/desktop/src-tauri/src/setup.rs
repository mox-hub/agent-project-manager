//! 桌面端初始化共享逻辑：目录创建、密钥持久化、Prisma 建库、Node 运行时解析。
//! lib.rs 的后台初始化与 commands::init_app 共用同一条路径，避免两套逻辑漂移。

use crate::config::AppConfig;
use std::path::PathBuf;
use tracing::info;

pub fn initialize_dirs(config: &AppConfig) -> Result<(), String> {
    for dir in [&config.user_data_dir, &config.logs_dir, &config.upload_dir] {
        if !dir.exists() {
            std::fs::create_dir_all(dir)
                .map_err(|e| format!("创建目录失败 {}: {}", dir.display(), e))?;
        }
    }
    Ok(())
}

/// 解析 Node 运行时：打包模式用随包分发的 node.exe（必须存在），开发模式回落 PATH。
pub fn resolve_node(config: &AppConfig) -> Result<PathBuf, String> {
    match &config.node_exe {
        Some(p) => {
            if p.exists() {
                Ok(p.clone())
            } else {
                Err(format!(
                    "未找到 Node.js 运行时（{}）。安装包可能不完整，请重新安装。",
                    p.display()
                ))
            }
        }
        None => Ok(PathBuf::from("node")),
    }
}

/// 首启生成随机密钥并落盘 secrets.json，后续启动复用——JWT 签名与集成加密要求密钥跨重启稳定。
pub fn ensure_secrets(config: &mut AppConfig) -> Result<(), String> {
    let path = config.user_data_dir.join("secrets.json");
    let load = || -> Result<(String, String), String> {
        let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
        let jwt = v
            .get("jwt_secret")
            .and_then(|x| x.as_str())
            .unwrap_or_default()
            .to_string();
        let integration = v
            .get("integration_key")
            .and_then(|x| x.as_str())
            .unwrap_or_default()
            .to_string();
        if jwt.is_empty() || integration.is_empty() {
            return Err("secrets.json 缺少密钥字段".to_string());
        }
        Ok((jwt, integration))
    };

    match load() {
        Ok((jwt, integration)) => {
            config.jwt_secret = jwt;
            config.integration_key = integration;
            info!("已加载既有密钥: {}", path.display());
        }
        Err(_) => {
            let jwt = random_hex(32);
            let integration = random_hex(32);
            let payload = serde_json::json!({
                "jwt_secret": jwt,
                "integration_key": integration,
            });
            std::fs::write(
                &path,
                serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?,
            )
            .map_err(|e| format!("写入密钥文件失败 {}: {}", path.display(), e))?;
            config.jwt_secret = jwt;
            config.integration_key = integration;
            info!("已生成新密钥: {}", path.display());
        }
    }
    Ok(())
}

fn random_hex(bytes: usize) -> String {
    use rand::RngCore;
    let mut buf = vec![0u8; bytes];
    rand::rng().fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{:02x}", b)).collect()
}

/// 仅在库文件不存在（全新安装）时执行 prisma db push——已存在的库不再带
/// `--accept-data-loss` 重建，升级场景的 schema 演进另行走 migrate deploy（v0.6.1 后再议）。
/// 返回值表示是否实际执行了建库。
pub fn run_db_push_if_needed(config: &AppConfig) -> Result<bool, String> {
    if config.database_path.exists() {
        info!(
            "数据库已存在，跳过 db push: {}",
            config.database_path.display()
        );
        return Ok(false);
    }

    let prisma_schema = config.server_cwd.join("prisma").join("schema.prisma");
    if !prisma_schema.exists() {
        return Err(format!("未找到 Prisma schema: {}", prisma_schema.display()));
    }
    let prisma_entry = config
        .server_cwd
        .join("node_modules")
        .join("prisma")
        .join("build")
        .join("index.js");
    if !prisma_entry.exists() {
        return Err(format!("未找到 Prisma CLI: {}", prisma_entry.display()));
    }
    let node = resolve_node(config)?;

    if let Some(parent) = config.database_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("创建数据目录失败: {}", e))?;
        }
    }

    info!("首次启动，运行 Prisma db push...");
    let output = std::process::Command::new(&node)
        .arg(&prisma_entry)
        .args([
            "db",
            "push",
            "--schema",
            &prisma_schema.to_string_lossy(),
            "--skip-generate",
        ])
        .env("DATABASE_URL", config.get_database_url())
        .env("PRISMA_CLIENT_ENGINE_TYPE", "library")
        .output()
        .map_err(|e| format!("执行 Prisma 失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("数据库初始化失败（Prisma db push）: {}", stderr));
    }
    info!("Prisma db push 完成");
    Ok(true)
}
