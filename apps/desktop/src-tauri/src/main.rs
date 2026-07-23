// El "kernel" de v0.x vive en TypeScript (RFC-0002 §4.1); este binario es solo
// el caparazón: ventana, diálogos nativos y acceso a archivos mediado por las
// capacidades declaradas en capabilities/default.json.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error al arrancar Verne");
}
