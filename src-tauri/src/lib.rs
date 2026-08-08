use serde::Serialize;
use std::net::TcpListener;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::{process::CommandChild, ShellExt};
use uuid::Uuid;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendConnection {
    base_url: String,
    token: String,
}

#[derive(Default)]
struct BackendState {
    child: Mutex<Option<CommandChild>>,
    connection: Mutex<Option<BackendConnection>>,
}

fn available_port() -> Result<u16, String> {
    TcpListener::bind(("127.0.0.1", 0))
        .and_then(|listener| listener.local_addr())
        .map(|address| address.port())
        .map_err(|error| format!("cannot reserve a backend port: {error}"))
}

fn ensure_backend(app: &AppHandle, state: &BackendState) -> Result<BackendConnection, String> {
    if let Some(connection) = state
        .connection
        .lock()
        .map_err(|_| "backend state is poisoned")?
        .clone()
    {
        return Ok(connection);
    }

    let port = available_port()?;
    let token = Uuid::new_v4().simple().to_string();
    let llama_url =
        std::env::var("LOCALFORGE_API_URL").unwrap_or_else(|_| "http://127.0.0.1:8080".to_string());

    let command = app
        .shell()
        .sidecar("localforge-backend")
        .map_err(|error| format!("backend sidecar is unavailable: {error}"))?
        .args([
            "--port",
            &port.to_string(),
            "--token",
            &token,
            "--llama-url",
            &llama_url,
        ]);

    let (_events, child) = command
        .spawn()
        .map_err(|error| format!("cannot start backend sidecar: {error}"))?;

    let connection = BackendConnection {
        base_url: format!("http://127.0.0.1:{port}"),
        token,
    };
    *state
        .child
        .lock()
        .map_err(|_| "backend state is poisoned")? = Some(child);
    *state
        .connection
        .lock()
        .map_err(|_| "backend state is poisoned")? = Some(connection.clone());
    Ok(connection)
}

#[tauri::command]
fn start_backend(
    app: AppHandle,
    state: State<'_, BackendState>,
) -> Result<BackendConnection, String> {
    ensure_backend(&app, state.inner())
}

#[tauri::command]
fn stop_backend(state: State<'_, BackendState>) -> Result<(), String> {
    if let Some(child) = state
        .child
        .lock()
        .map_err(|_| "backend state is poisoned")?
        .take()
    {
        child
            .kill()
            .map_err(|error| format!("cannot stop backend: {error}"))?;
    }
    *state
        .connection
        .lock()
        .map_err(|_| "backend state is poisoned")? = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendState::default())
        .setup(|app| {
            ensure_backend(app.handle(), app.state::<BackendState>().inner())
                .map(|_| ())
                .map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_backend, stop_backend])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                let state = window.state::<BackendState>();
                if let Ok(mut child) = state.child.lock() {
                    if let Some(child) = child.take() {
                        let _ = child.kill();
                    }
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running LocalForge AI v2");
}
