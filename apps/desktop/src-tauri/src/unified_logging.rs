use std::io::{BufRead, BufReader};
use std::thread;
use tracing::{error, info, warn};

#[derive(Debug, Clone)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub message: String,
}

fn get_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    let millis = duration.subsec_millis();
    format!("{}.{:03}", secs, millis)
}

fn extract_log_level(line: &str) -> (&str, &str) {
    let upper = line.to_uppercase();
    if upper.contains("ERROR") || upper.contains("[E]") || upper.starts_with("ERR") {
        ("ERROR", line)
    } else if upper.contains("WARN") || upper.contains("[W]") || upper.starts_with("WRN") {
        ("WARN", line)
    } else if upper.contains("DEBUG") || upper.contains("[D]") || upper.starts_with("DBG") {
        ("DEBUG", line)
    } else {
        ("INFO", line)
    }
}

fn parse_log_line(source: &str, line: &str) -> LogEntry {
    let (level, message) = extract_log_level(line);
    LogEntry {
        timestamp: get_timestamp(),
        level: level.to_string(),
        source: source.to_string(),
        message: message.to_string(),
    }
}

fn log_entry_to_tracing(entry: &LogEntry) {
    match entry.level.as_str() {
        "ERROR" => error!(source = %entry.source, "[{}] {}", entry.source, entry.message),
        "WARN" => warn!(source = %entry.source, "[{}] {}", entry.source, entry.message),
        "DEBUG" => tracing::debug!(source = %entry.source, "[{}] {}", entry.source, entry.message),
        _ => info!(source = %entry.source, "[{}] {}", entry.source, entry.message),
    }
}

pub fn spawn_log_redirector(
    source_name: &str,
    reader: Box<dyn std::io::Read + Send>,
) {
    let source = source_name.to_string();
    thread::spawn(move || {
        let buffered = BufReader::new(reader);
        for line in buffered.lines() {
            match line {
                Ok(content) => {
                    let entry = parse_log_line(&source, &content);
                    log_entry_to_tracing(&entry);
                }
                Err(e) => {
                    error!("[{}] 读取日志失败: {}", source, e);
                    break;
                }
            }
        }
        info!("[{}] 日志重定向线程结束", source);
    });
}
