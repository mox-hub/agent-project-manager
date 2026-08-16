use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
pub struct AppConfig {
    pub server_entry: PathBuf,
    pub server_cwd: PathBuf,
    pub frontend_dist: PathBuf,
    pub user_data_dir: PathBuf,
    pub logs_dir: PathBuf,
    pub database_path: PathBuf,
    pub upload_dir: PathBuf,
    pub jwt_secret: String,
    pub integration_key: String,
    pub default_port: u16,
    pub max_port: u16,
}

impl AppConfig {
    pub fn new() -> Self {
        let user_data_dir = dirs::data_local_dir()
            .map(|p| p.join("com.agentpm.desktop"))
            .unwrap_or_else(|| PathBuf::from("./data"));

        let logs_dir = user_data_dir.join("logs");
        let database_path = user_data_dir.join("data").join("agent-project-manager.db");
        let upload_dir = user_data_dir.join("uploads");

        Self {
            server_entry: PathBuf::new(),
            server_cwd: PathBuf::new(),
            frontend_dist: PathBuf::new(),
            user_data_dir,
            logs_dir,
            database_path,
            upload_dir,
            jwt_secret: String::new(),
            integration_key: String::new(),
            default_port: 4300,
            max_port: 4399,
        }
    }

    pub fn get_database_url(&self) -> String {
        format!("file:{}", self.database_path.to_string_lossy().replace('\\', "/"))
    }
}
