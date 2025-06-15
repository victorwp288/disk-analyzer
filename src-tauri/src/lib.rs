use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub children: Vec<FileInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub root: FileInfo,
    pub total_size: u64,
    pub file_count: usize,
    pub error_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgress {
    pub current_path: String,
    pub files_processed: usize,
    pub total_size_so_far: u64,
    pub estimated_total: Option<usize>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn scan_directory(path: String, app_handle: AppHandle) -> Result<ScanResult, String> {
    scan_directory_impl(&path, app_handle).await.map_err(|e| e.to_string())
}

async fn scan_directory_impl(root_path: &str, app_handle: AppHandle) -> Result<ScanResult, Box<dyn std::error::Error>> {
    let root_path = Path::new(root_path);
    
    if !root_path.exists() {
        return Err("Path does not exist".into());
    }

    let mut total_size = 0u64;
    let mut file_count = 0usize;
    let mut error_count = 0usize;
    let mut directory_sizes: HashMap<String, u64> = HashMap::new();
    
    // First pass: calculate sizes for all files with progress reporting
    let walker = WalkDir::new(root_path)
        .max_depth(4) // Limit depth to prevent going too deep
        .into_iter();
    let mut last_progress_update = std::time::Instant::now();
    let scan_start_time = std::time::Instant::now();
    const MAX_FILES: usize = 50000; // Stop after 50k files to prevent infinite scanning
    const MAX_SCAN_TIME: std::time::Duration = std::time::Duration::from_secs(300); // 5 minute timeout
    
    for entry in walker {
        // Check timeout
        if scan_start_time.elapsed() > MAX_SCAN_TIME {
            break;
        }
        match entry {
            Ok(entry) => {
                if entry.file_type().is_file() {
                    match entry.metadata() {
                        Ok(metadata) => {
                            let size = metadata.len();
                            total_size += size;
                            file_count += 1;
                            
                            // Stop if we've hit the file limit
                            if file_count >= MAX_FILES {
                                break;
                            }
                            
                            // Add size to all parent directories
                            let mut current_path = entry.path();
                            while let Some(parent) = current_path.parent() {
                                if parent == root_path {
                                    break;
                                }
                                let parent_str = parent.to_string_lossy().to_string();
                                *directory_sizes.entry(parent_str).or_insert(0) += size;
                                current_path = parent;
                            }
                            
                            // Send progress update every 100ms
                            if last_progress_update.elapsed().as_millis() > 100 {
                                let progress = ScanProgress {
                                    current_path: entry.path().to_string_lossy().to_string(),
                                    files_processed: file_count,
                                    total_size_so_far: total_size,
                                    estimated_total: None,
                                };
                                
                                let _ = app_handle.emit("scan-progress", &progress);
                                last_progress_update = std::time::Instant::now();
                            }
                        }
                        Err(_) => error_count += 1,
                    }
                }
            }
            Err(_) => error_count += 1,
        }
    }

    // Second pass: build the tree structure
    let root = build_file_tree(root_path, &directory_sizes)?;

    Ok(ScanResult {
        root,
        total_size,
        file_count,
        error_count,
    })
}

fn build_file_tree(path: &Path, directory_sizes: &HashMap<String, u64>) -> Result<FileInfo, Box<dyn std::error::Error>> {
    let metadata = fs::metadata(path)?;
    let name = path.file_name()
        .unwrap_or_else(|| path.as_os_str())
        .to_string_lossy()
        .to_string();
    
    let path_str = path.to_string_lossy().to_string();
    
    if metadata.is_dir() {
        let mut children = Vec::new();
        let mut dir_size = 0u64;
        
        // Only scan immediate children to avoid deep recursion
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten().take(100) { // Limit to first 100 entries
                if let Ok(child_info) = build_file_tree(&entry.path(), directory_sizes) {
                    dir_size += child_info.size;
                    children.push(child_info);
                }
            }
        }
        
        // Use calculated size from first pass if available
        let final_size = directory_sizes.get(&path_str).copied().unwrap_or(dir_size);
        
        // Sort children by size (largest first)
        children.sort_by(|a, b| b.size.cmp(&a.size));
        
        Ok(FileInfo {
            name,
            path: path_str,
            size: final_size,
            is_dir: true,
            children,
        })
    } else {
        Ok(FileInfo {
            name,
            path: path_str,
            size: metadata.len(),
            is_dir: false,
            children: Vec::new(),
        })
    }
}

#[tauri::command]
fn format_bytes(bytes: u64) -> String {
    human_bytes::human_bytes(bytes as f64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, scan_directory, format_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}