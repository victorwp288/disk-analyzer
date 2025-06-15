use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use rayon::prelude::*;
use tauri::{AppHandle, Emitter};

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

    // Use a much faster approach - scan directories in parallel
    let scan_start_time = std::time::Instant::now();
    let total_files = Arc::new(Mutex::new(0usize));
    let total_size = Arc::new(Mutex::new(0u64));
    let error_count = Arc::new(Mutex::new(0usize));
    let last_progress = Arc::new(Mutex::new(std::time::Instant::now()));

    // Fast parallel directory scan
    let root = scan_directory_parallel(root_path, &app_handle, &total_files, &total_size, &error_count, &last_progress)?;
    
    let final_file_count = *total_files.lock().unwrap();
    let final_total_size = *total_size.lock().unwrap();
    let final_error_count = *error_count.lock().unwrap();

    Ok(ScanResult {
        root,
        total_size: final_total_size,
        file_count: final_file_count,
        error_count: final_error_count,
    })
}

fn scan_directory_parallel(
    path: &Path,
    app_handle: &AppHandle,
    total_files: &Arc<Mutex<usize>>,
    total_size: &Arc<Mutex<u64>>,
    error_count: &Arc<Mutex<usize>>,
    last_progress: &Arc<Mutex<std::time::Instant>>,
) -> Result<FileInfo, Box<dyn std::error::Error>> {
    let metadata = match fs::metadata(path) {
        Ok(meta) => meta,
        Err(_) => {
            *error_count.lock().unwrap() += 1;
            return Err("Cannot read metadata".into());
        }
    };

    let name = path.file_name()
        .unwrap_or_else(|| path.as_os_str())
        .to_string_lossy()
        .to_string();
    
    let path_str = path.to_string_lossy().to_string();

    if metadata.is_file() {
        let size = metadata.len();
        *total_files.lock().unwrap() += 1;
        *total_size.lock().unwrap() += size;
        
        // Progress update
        let mut last_update = last_progress.lock().unwrap();
        if last_update.elapsed().as_millis() > 50 {
            let progress = ScanProgress {
                current_path: path_str.clone(),
                files_processed: *total_files.lock().unwrap(),
                total_size_so_far: *total_size.lock().unwrap(),
                estimated_total: None,
            };
            let _ = app_handle.emit("scan-progress", &progress);
            *last_update = std::time::Instant::now();
        }

        return Ok(FileInfo {
            name,
            path: path_str,
            size,
            is_dir: false,
            children: Vec::new(),
        });
    }

    // Directory processing - much faster approach
    let entries: Vec<PathBuf> = match fs::read_dir(path) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .take(500) // Limit entries per directory
            .collect(),
        Err(_) => {
            *error_count.lock().unwrap() += 1;
            return Ok(FileInfo {
                name,
                path: path_str,
                size: 0,
                is_dir: true,
                children: Vec::new(),
            });
        }
    };

    // Process entries in parallel - this is where the speed comes from!
    let children: Vec<FileInfo> = entries
        .par_iter() // Parallel iterator!
        .filter_map(|child_path| {
            scan_directory_parallel(child_path, app_handle, total_files, total_size, error_count, last_progress).ok()
        })
        .collect();

    // Calculate directory size from children
    let dir_size: u64 = children.iter().map(|child| child.size).sum();

    // Sort children by size (largest first) and limit to top 50 for performance
    let mut sorted_children = children;
    sorted_children.sort_by(|a, b| b.size.cmp(&a.size));
    sorted_children.truncate(50);

    Ok(FileInfo {
        name,
        path: path_str,
        size: dir_size,
        is_dir: true,
        children: sorted_children,
    })
}


#[tauri::command]
fn format_bytes(bytes: u64) -> String {
    human_bytes::human_bytes(bytes as f64)
}

#[tauri::command]
async fn open_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try to use the default file manager
        let parent = Path::new(&path).parent()
            .ok_or("Could not get parent directory")?;
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
async fn delete_file_or_folder(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    
    if path_obj.is_file() {
        fs::remove_file(path_obj).map_err(|e| e.to_string())?;
    } else if path_obj.is_dir() {
        fs::remove_dir_all(path_obj).map_err(|e| e.to_string())?;
    } else {
        return Err("Path does not exist".to_string());
    }
    
    Ok(())
}

#[tauri::command]
fn copy_to_clipboard(text: String) -> Result<(), String> {
    // This is a simple implementation - in a real app you might want to use a clipboard crate
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            scan_directory, 
            format_bytes, 
            open_in_explorer, 
            delete_file_or_folder, 
            copy_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}