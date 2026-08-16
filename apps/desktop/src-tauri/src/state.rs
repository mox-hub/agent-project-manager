use crate::config::AppConfig;
use serde::Serialize;
use std::path::PathBuf;
use std::process::Child;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize)]
pub struct FrontendInfo {
    pub port: u16,
    pub url: String,
    pub pid: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct FrontendStatus {
    pub running: bool,
    pub info: Option<FrontendInfo>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackendInfo {
    pub port: u16,
    pub api_base_url: String,
    pub pid: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackendStatus {
    pub running: bool,
    pub info: Option<BackendInfo>,
}

#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub backend_process: Arc<RwLock<Option<Child>>>,
    pub backend_info: Arc<RwLock<Option<BackendInfo>>>,
    pub frontend_process: Arc<RwLock<Option<Child>>>,
    pub frontend_info: Arc<RwLock<Option<FrontendInfo>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            config: AppConfig::new(),
            backend_process: Arc::new(RwLock::new(None)),
            backend_info: Arc::new(RwLock::new(None)),
            frontend_process: Arc::new(RwLock::new(None)),
            frontend_info: Arc::new(RwLock::new(None)),
        }
    }

    pub fn with_config(config: AppConfig) -> Self {
        Self {
            config,
            backend_process: Arc::new(RwLock::new(None)),
            backend_info: Arc::new(RwLock::new(None)),
            frontend_process: Arc::new(RwLock::new(None)),
            frontend_info: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn set_backend(&self, process: Child, info: BackendInfo) {
        *self.backend_process.write().await = Some(process);
        *self.backend_info.write().await = Some(info);
    }

    pub async fn clear_backend(&self) {
        *self.backend_process.write().await = None;
        *self.backend_info.write().await = None;
    }

    pub async fn get_backend_status(&self) -> BackendStatus {
        let info: Option<BackendInfo> = self.backend_info.read().await.clone();
        BackendStatus {
            running: info.is_some(),
            info,
        }
    }

    pub async fn get_backend_info(&self) -> Option<BackendInfo> {
        self.backend_info.read().await.clone()
    }

    pub async fn set_frontend(&self, process: Child, info: FrontendInfo) {
        *self.frontend_process.write().await = Some(process);
        *self.frontend_info.write().await = Some(info);
    }

    pub async fn clear_frontend(&self) {
        *self.frontend_process.write().await = None;
        *self.frontend_info.write().await = None;
    }

    pub async fn get_frontend_status(&self) -> FrontendStatus {
        let info: Option<FrontendInfo> = self.frontend_info.read().await.clone();
        FrontendStatus {
            running: info.is_some(),
            info,
        }
    }

    pub async fn get_frontend_info(&self) -> Option<FrontendInfo> {
        self.frontend_info.read().await.clone()
    }

    pub fn resolve_runtime_assets(&self) -> (PathBuf, PathBuf, PathBuf) {
        let server_entry = self.config.server_entry.clone();
        let server_cwd = self.config.server_cwd.clone();
        let frontend_dist = self.config.frontend_dist.clone();
        (server_entry, server_cwd, frontend_dist)
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
