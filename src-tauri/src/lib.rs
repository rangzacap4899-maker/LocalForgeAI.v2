use serde::Serialize;
use std::ffi::OsString;
use std::net::TcpListener;
use std::path::{Component, PathBuf};
use std::process::{Child, Command, Stdio};
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelRuntimeStatus {
    state: &'static str,
    model_id: Option<String>,
    model_name: Option<String>,
    managed: bool,
    error: Option<String>,
}

#[derive(Default)]
struct BackendState {
    inner: Mutex<BackendInner>,
}

#[derive(Default)]
struct BackendInner {
    child: Option<CommandChild>,
    connection: Option<BackendConnection>,
}

#[derive(Default)]
struct LlamaState {
    inner: Mutex<LlamaInner>,
}

#[derive(Default)]
struct LlamaInner {
    child: Option<Child>,
    port: Option<u16>,
    model_id: Option<String>,
    model_name: Option<String>,
    last_error: Option<String>,
}

fn available_port() -> Result<u16, String> {
    TcpListener::bind(("127.0.0.1", 0))
        .and_then(|listener| listener.local_addr())
        .map(|address| address.port())
        .map_err(|error| format!("cannot reserve a local port: {error}"))
}

fn configured_external_endpoint() -> Option<String> {
    std::env::var("LOCALFORGE_API_URL")
        .ok()
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
}

fn llama_endpoint(state: &LlamaState) -> Result<String, String> {
    if let Some(endpoint) = configured_external_endpoint() {
        return Ok(endpoint);
    }
    let mut inner = state
        .inner
        .lock()
        .map_err(|_| "model runtime state is poisoned")?;
    let port = match inner.port {
        Some(port) => port,
        None => {
            let port = available_port()?;
            inner.port = Some(port);
            port
        }
    };
    Ok(format!("http://127.0.0.1:{port}"))
}

fn allowed_renderer_origins() -> Vec<&'static str> {
    let mut origins = vec!["http://tauri.localhost", "tauri://localhost"];
    if cfg!(debug_assertions) {
        origins.extend(["http://localhost:1420", "http://127.0.0.1:1420"]);
    }
    origins
}

fn ensure_backend(
    app: &AppHandle,
    state: &BackendState,
    llama_state: &LlamaState,
) -> Result<BackendConnection, String> {
    let mut inner = state
        .inner
        .lock()
        .map_err(|_| "backend state is poisoned")?;
    if let Some(connection) = inner.connection.clone() {
        return Ok(connection);
    }

    let port = available_port()?;
    let token = Uuid::new_v4().simple().to_string();
    let llama_url = llama_endpoint(llama_state)?;
    let mut arguments = vec![
        "--port".to_string(),
        port.to_string(),
        "--token".to_string(),
        token.clone(),
        "--llama-url".to_string(),
        llama_url,
    ];
    for origin in allowed_renderer_origins() {
        arguments.push("--allowed-origin".to_string());
        arguments.push(origin.to_string());
    }

    let command = app
        .shell()
        .sidecar("localforge-backend")
        .map_err(|error| format!("backend sidecar is unavailable: {error}"))?
        .args(arguments);

    let (_events, child) = command
        .spawn()
        .map_err(|error| format!("cannot start backend sidecar: {error}"))?;

    let connection = BackendConnection {
        base_url: format!("http://127.0.0.1:{port}"),
        token,
    };
    inner.child = Some(child);
    inner.connection = Some(connection.clone());
    Ok(connection)
}

fn model_root() -> Result<PathBuf, String> {
    if let Some(configured) = std::env::var_os("LOCALFORGE_V2_MODEL_ROOT") {
        return Ok(PathBuf::from(configured));
    }
    let home = std::env::var_os("HOME").ok_or("cannot determine the user home directory")?;
    Ok(PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("localforge-ai-v2")
        .join("models"))
}

fn validate_model_id(model_id: &str) -> Result<PathBuf, String> {
    if model_id.is_empty() {
        return Err("model id is required".to_string());
    }
    let relative = PathBuf::from(model_id);
    if !relative
        .components()
        .all(|component| matches!(component, Component::Normal(_)))
    {
        return Err("invalid model id".to_string());
    }
    let filename = relative
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or("invalid model filename")?;
    let lowered = filename.to_ascii_lowercase();
    if !lowered.ends_with(".gguf") || lowered.contains("mmproj") || lowered.contains("projector") {
        return Err("only primary GGUF model files can be loaded".to_string());
    }
    Ok(relative)
}

fn resolve_managed_model(model_id: &str) -> Result<PathBuf, String> {
    let relative = validate_model_id(model_id)?;
    let root = model_root()?
        .canonicalize()
        .map_err(|error| format!("managed model directory is unavailable: {error}"))?;
    let model = root
        .join(relative)
        .canonicalize()
        .map_err(|error| format!("model file is unavailable: {error}"))?;
    if !model.starts_with(&root) || !model.is_file() {
        return Err("model must be a file inside the managed v2 directory".to_string());
    }
    Ok(model)
}

fn executable_candidate(path: PathBuf) -> Option<PathBuf> {
    path.is_file().then_some(path)
}

fn find_in_path(name: &str) -> Option<PathBuf> {
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths)
            .map(|directory| directory.join(name))
            .find(|candidate| candidate.is_file())
    })
}

fn llama_server_executable() -> Result<PathBuf, String> {
    if let Some(configured) = std::env::var_os("LOCALFORGE_LLAMA_SERVER_BIN") {
        return executable_candidate(PathBuf::from(configured))
            .ok_or_else(|| "LOCALFORGE_LLAMA_SERVER_BIN does not point to a file".to_string());
    }
    if let Some(path) = find_in_path("llama-server") {
        return Ok(path);
    }
    if let Some(home) = std::env::var_os("HOME") {
        let runtime = PathBuf::from(home)
            .join("LocalForge-AI")
            .join("runtime")
            .join("llama.cpp");
        for relative in [
            ["build-vulkan", "bin", "llama-server"],
            ["build", "bin", "llama-server"],
        ] {
            let path = runtime
                .join(relative[0])
                .join(relative[1])
                .join(relative[2]);
            if let Some(path) = executable_candidate(path) {
                return Ok(path);
            }
        }
    }
    for candidate in ["/usr/local/bin/llama-server", "/usr/bin/llama-server"] {
        if let Some(path) = executable_candidate(PathBuf::from(candidate)) {
            return Ok(path);
        }
    }
    Err("llama-server was not found; set LOCALFORGE_LLAMA_SERVER_BIN".to_string())
}

fn stop_llama_child(inner: &mut LlamaInner) -> Result<(), String> {
    if let Some(mut child) = inner.child.take() {
        child
            .kill()
            .map_err(|error| format!("cannot stop llama-server: {error}"))?;
        let _ = child.wait();
    }
    inner.model_id = None;
    inner.model_name = None;
    Ok(())
}

fn runtime_status(inner: &mut LlamaInner) -> Result<ModelRuntimeStatus, String> {
    if configured_external_endpoint().is_some() {
        return Ok(ModelRuntimeStatus {
            state: "external",
            model_id: None,
            model_name: None,
            managed: false,
            error: None,
        });
    }
    if let Some(child) = inner.child.as_mut() {
        if let Some(status) = child
            .try_wait()
            .map_err(|error| format!("cannot inspect llama-server: {error}"))?
        {
            inner.child = None;
            inner.model_id = None;
            inner.model_name = None;
            inner.last_error = Some(format!("llama-server exited with {status}"));
        }
    }
    Ok(ModelRuntimeStatus {
        state: if inner.child.is_some() {
            "running"
        } else {
            "stopped"
        },
        model_id: inner.model_id.clone(),
        model_name: inner.model_name.clone(),
        managed: true,
        error: inner.last_error.clone(),
    })
}

#[tauri::command]
fn start_backend(
    app: AppHandle,
    state: State<'_, BackendState>,
    llama_state: State<'_, LlamaState>,
) -> Result<BackendConnection, String> {
    ensure_backend(&app, state.inner(), llama_state.inner())
}

#[tauri::command]
fn stop_backend(state: State<'_, BackendState>) -> Result<(), String> {
    let mut inner = state
        .inner
        .lock()
        .map_err(|_| "backend state is poisoned")?;
    if let Some(child) = inner.child.take() {
        child
            .kill()
            .map_err(|error| format!("cannot stop backend: {error}"))?;
    }
    inner.connection = None;
    Ok(())
}

#[tauri::command]
fn get_model_runtime(state: State<'_, LlamaState>) -> Result<ModelRuntimeStatus, String> {
    let mut inner = state
        .inner
        .lock()
        .map_err(|_| "model runtime state is poisoned")?;
    runtime_status(&mut inner)
}

#[tauri::command]
fn load_model(
    model_id: String,
    state: State<'_, LlamaState>,
) -> Result<ModelRuntimeStatus, String> {
    if configured_external_endpoint().is_some() {
        return Err("model loading is disabled while LOCALFORGE_API_URL is configured".to_string());
    }
    let model = resolve_managed_model(&model_id)?;
    let executable = llama_server_executable()?;
    let model_name = model
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .ok_or("invalid model filename")?;
    let mut inner = state
        .inner
        .lock()
        .map_err(|_| "model runtime state is poisoned")?;
    stop_llama_child(&mut inner)?;
    let port = match inner.port {
        Some(port) => port,
        None => {
            let port = available_port()?;
            inner.port = Some(port);
            port
        }
    };
    let child = Command::new(executable)
        .args([
            OsString::from("--model"),
            model.into_os_string(),
            OsString::from("--host"),
            OsString::from("127.0.0.1"),
            OsString::from("--port"),
            OsString::from(port.to_string()),
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("cannot start llama-server: {error}"))?;
    inner.child = Some(child);
    inner.model_id = Some(model_id);
    inner.model_name = Some(model_name);
    inner.last_error = None;
    runtime_status(&mut inner)
}

#[tauri::command]
fn unload_model(state: State<'_, LlamaState>) -> Result<ModelRuntimeStatus, String> {
    let mut inner = state
        .inner
        .lock()
        .map_err(|_| "model runtime state is poisoned")?;
    stop_llama_child(&mut inner)?;
    inner.last_error = None;
    runtime_status(&mut inner)
}

fn stop_children(backend: &BackendState, llama: &LlamaState) {
    if let Ok(mut inner) = backend.inner.lock() {
        if let Some(child) = inner.child.take() {
            let _ = child.kill();
        }
        inner.connection = None;
    }
    if let Ok(mut inner) = llama.inner.lock() {
        let _ = stop_llama_child(&mut inner);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendState::default())
        .manage(LlamaState::default())
        .setup(|app| {
            ensure_backend(
                app.handle(),
                app.state::<BackendState>().inner(),
                app.state::<LlamaState>().inner(),
            )
            .map(|_| ())
            .map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            get_model_runtime,
            load_model,
            unload_model
        ])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                stop_children(
                    window.state::<BackendState>().inner(),
                    window.state::<LlamaState>().inner(),
                );
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running LocalForge AI v2");
}

#[cfg(test)]
mod tests {
    use super::validate_model_id;

    #[test]
    fn accepts_a_relative_managed_gguf_id() {
        assert!(validate_model_id("nested/model-Q4_K_M.gguf").is_ok());
    }

    #[test]
    fn rejects_model_path_traversal_and_projectors() {
        assert!(validate_model_id("../outside.gguf").is_err());
        assert!(validate_model_id("/tmp/outside.gguf").is_err());
        assert!(validate_model_id("model-mmproj.gguf").is_err());
        assert!(validate_model_id("notes.txt").is_err());
    }
}
