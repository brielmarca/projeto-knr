#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn builder<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![commands::collect_system_snapshot])
}

fn main() {
    builder(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error while running KRZ Boost");
}

#[cfg(test)]
mod ipc_tests;
