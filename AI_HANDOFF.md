# LocalForge AI v2 — AI Handoff

Last updated: 2026-08-08 (Asia/Bangkok)

This document is the source of truth for the next developer or AI agent working
on LocalForge AI v2. Read it completely before changing this repository.

## 1. Project scope and user intent

LocalForge AI v2 is a separate desktop application and repository. It is an
incremental replacement candidate for v1, not an in-place migration.

- v2 repository: `/home/addrang/LocalForgeAI.v2`
- GitHub: `https://github.com/rangzacap4899-maker/LocalForgeAI.v2.git`
- v1 repository: `/home/addrang/LocalForge-AI`
- Current application version: `0.2.0` (Preview)

Do not modify, remove, migrate, or reuse v1 application data unless the user
explicitly requests it. If work ever touches the v1 repository, read its own
`AGENTS.md` and `AI_HANDOFF.md` first. In particular, v1 has an existing user
change to `CMakeLists.txt` that must not be committed without explicit approval.

The user's visual direction is a clean, calm, low-noise desktop interface. The
default state must be genuinely empty. Do not add fake models, sample chats,
placeholder workspaces, mock MCP servers, fabricated diffs, or other preview
data. Helpful empty-state text and optional prompt suggestions are acceptable.

## 2. Current status

The app is a working Tauri 2 desktop shell with a React renderer and an
authenticated Python loopback sidecar. It can stream OpenAI-compatible chat
responses from a separately running `llama-server`.

Current clean-start behavior:

- no workspace is selected;
- no recent conversations are shown;
- no model is reported as loaded;
- Models, MCP, and Diff show honest empty states;
- the backend starts with the desktop application;
- `llama-server offline` is expected until the user loads a managed model or an
  external endpoint is configured.

Working renderer workflows:

- a user can select a workspace directory; supported text files are shown
  read-only and can be explicitly attached to a prompt;
- the paperclip button attaches supported text files up to 300 KB each and 1.2
  MB total;
- conversations are stored in the v2 WebKit profile and can be reopened from
  Recent; the plus button starts a clean chat;
- Settings persists temperature and maximum-token values and `/api/chat`
  forwards them to the inference server;
- Models calls the real authenticated `/api/models` endpoint and can rescan the
  v2 model directory;
- Model Manager searches bounded conventional locations on the host, returns
  opaque candidate IDs, and imports only a user-selected GGUF into the v2 root;
- Model Manager loads, stops, and switches managed models through a
  Rust-supervised `llama-server`; model IDs are canonicalized below the managed
  root and the renderer never supplies an executable or filesystem path;
- model downloads accept only HTTPS Hugging Face URLs, report progress, reject
  HTML pages and unsafe filenames, preserve a 256 MB disk reserve, and move a
  unique partial file into place atomically;
- backend and llama health are polled every three seconds;
- SSE parsing handles `[DONE]`, partial final buffers, and an aborted response
  without turning it into an error message.

The app is not yet at feature parity with v1 and must remain visibly labelled
Preview. MCP and Diff are honest empty states. Workspace selection and prompt
context work, but native filesystem writes and diff transactions have not been
implemented. Keep v1 as the primary application until the 1.0 gates in
`ROADMAP.md` are complete.

Known-good repository baseline:

- branch: `main`
- last published baseline before the 0.2 work: `f15f59c`
- CI: `https://github.com/rangzacap4899-maker/LocalForgeAI.v2/actions/runs/31246008300`
- Linux packaging:
  `https://github.com/rangzacap4899-maker/LocalForgeAI.v2/actions/runs/31246108782`

## 3. Architecture

```text
React + TypeScript renderer
        |
        | Tauri IPC: narrow desktop-only commands
        v
Rust / Tauri shell
        | starts sidecar + supervised llama-server
        | injects random bearer token and exact allowed origins
        v
Python loopback sidecar (127.0.0.1, random available port)
        |
        | OpenAI-compatible HTTP/SSE to a Rust-owned random port
        v
llama-server
```

Responsibilities:

- React renders the interface and consumes the sidecar API. It must not receive
  general shell or filesystem access.
- Rust owns privileged process lifecycle. It starts the Python sidecar and
  `llama-server`, validates managed model IDs, exposes only typed runtime status,
  and stops both children when the desktop window is destroyed.
- Python provides a small authenticated API, discovers local `.gguf` files, and
  proxies streaming chat requests to `llama-server`.
- Python owns AI orchestration and protocol translation, not general process
  creation. Future MCP process spawning also belongs in Rust behind registry IDs
  and explicit permissions; see `docs/ARCHITECTURE.md`.

Read `docs/ARCHITECTURE.md` before extending a boundary or adding a privileged
command.

## 4. Important source locations

- `src/` — React renderer and application styles
- `src/lib/backend.ts` — renderer-side sidecar connection and API client
- `src/lib/storage.ts` — local conversation and generation-setting persistence
- `src-tauri/src/lib.rs` — Tauri setup, commands, sidecar lifecycle, shutdown
- `src-tauri/tauri.conf.json` — desktop window and bundle configuration
- `backend/localforge_backend/server.py` — authenticated HTTP and SSE sidecar
- `backend/localforge_backend/model_operations.py` — bounded search, import,
  and background Hugging Face download jobs
- `backend/tests/` — Python backend tests
- `scripts/prepare_sidecar.py` — development sidecar wrapper preparation
- `scripts/build_sidecar.py` — production PyInstaller sidecar build
- `.github/workflows/ci.yml` — backend, renderer, and Rust validation
- `.github/workflows/package-linux.yml` — AppImage and native bundle packaging
- `docs/ARCHITECTURE.md` — design boundaries and migration sequence

## 5. Security invariants

Preserve these unless there is an explicit, reviewed design change:

- Bind the sidecar only to `127.0.0.1`.
- Generate a fresh random bearer token for every desktop session.
- Allow browser requests only from exact Tauri origins. Production permits
  `http://tauri.localhost` and `tauri://localhost`; debug builds additionally
  permit the fixed Vite origins. Never restore a wildcard CORS origin.
- Require authentication for `/health`, `/api/models`, and `/api/chat`.
- Do not persist the bearer token or expose it in logs.
- Keep the renderer free of arbitrary shell and filesystem capabilities.
- Keep Tauri commands narrow and typed.
- Treat model paths, workspace paths, MCP tools, and upstream responses as
  untrusted input.
- Never expose discovered host paths to the renderer. Local model candidates
  use session-scoped opaque IDs and can only be copied into the managed root.
- Restrict model downloads to HTTPS Hugging Face hosts, `.gguf` filenames, and
  non-overwriting atomic completion.
- Preserve the request-size limit in the sidecar. It is currently 2,000,000
  bytes.
- Do not perform filesystem writes from chat output. Future workspace edits must
  use previewable diffs and explicit user approval.

Requests without an `Origin` remain supported for native diagnostics. A request
with any other browser origin is rejected before bearer authentication, and the
sidecar echoes an allowlisted origin rather than returning a wildcard.

## 6. Runtime configuration and data

Defaults:

- llama-server URL: a random Rust-owned loopback port for managed mode
- model root: `~/.local/share/localforge-ai-v2/models`
- WebKit/app profile: `~/.local/share/io.localforge.LocalForgeAI.v2`

The model endpoint recursively discovers `.gguf` files and excludes projector
files. A healthy sidecar with no llama-server returns a successful health
response with `llamaReachable: false`; this is not a sidecar failure.

The runtime executable lookup order is `LOCALFORGE_LLAMA_SERVER_BIN`, `PATH`,
the two known v1 source runtime builds on this development host, then
`/usr/local/bin` and `/usr/bin`. The release bundle does not yet include
llama.cpp. On Linux, Rust prepends the selected executable's directory to the
child's `LD_LIBRARY_PATH` so adjacent llama.cpp shared libraries resolve without
mutating the desktop process environment. `LOCALFORGE_API_URL` selects an
externally owned inference endpoint and intentionally disables managed
load/unload commands.

Local search checks these conventional locations when present:

- `~/Downloads`, `~/Models`, and `~/models`
- `~/.cache/huggingface/hub`
- `~/.cache/lm-studio/models`
- `~/.local/share/localforge-ai/models` (read-only v1 source)
- `~/LocalForge-AI/models` (the current v1 source checkout used on this host)

Search does not recursively scan the entire home directory. Import copies a
selected candidate into the v2 model root and never deletes or alters its source.
On the current host, search is expected to find five primary GGUF models under
`~/LocalForge-AI/models`; projector and llama.cpp vocabulary fixtures are
excluded. The Models UI tracks whether a search completed and shows an explicit
empty result instead of silently returning to the unchanged screen.

The v1 data directory is separate:
`~/.local/share/localforge-ai`. Never merge or delete it as part of v2 cleanup.

Conversation history and generation settings use WebView `localStorage` inside
the v2 WebKit profile. Workspace file contents and attachments are session-only
and are not copied into the model directory.

## 7. Development and verification

Typical checks from the repository root:

```bash
PYTHONPATH=backend python3 -m compileall -q backend scripts
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -v
npm ci
npm run build
npm run sidecar:prepare
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --lib
git diff --check
```

For desktop development:

```bash
npm run desktop:dev
```

The frontend-only Vite server cannot start the native sidecar. In a normal
browser, `connectBackend()` has no Tauri IPC and chat will remain disconnected.
Use the Tauri desktop command when validating the complete application.

The local machine's temporary Node and Rust toolchains were removed after the
last build to reclaim disk space. If the commands above are unavailable, use CI,
a container, or install an appropriate local toolchain. The CI baseline is:

- Ubuntu 24.04
- Python 3.12
- Node.js 22
- stable Rust

After a material change, update this handoff with the new state, limitations,
and verification evidence.

## 8. Linux packaging and Bazzite

The packaging workflow produces two formats:

- AppImage, intended for compatible conventional Linux distributions;
- `LocalForge-AI-v2-linux-x86_64-native.tar.gz`, the preferred build for Fedora
  Atomic/Bazzite.

Do not recommend the current AppImage on Bazzite. The Ubuntu-built AppImage
previously opened as a white window because bundled Ubuntu WebKit/GStreamer
libraries interacted badly with the host's Fedora/Bazzite EGL/Mesa stack.
Disabling DMABUF, compositing, or hardware rendering did not resolve it.

The native portable bundle avoids that mismatch by dynamically using the host's
WebKitGTK stack. The known working user-local installation is:

```text
/home/addrang/.local/opt/localforge-ai-v2/localforge-ai-v2
/home/addrang/.local/opt/localforge-ai-v2/localforge-backend
/home/addrang/.local/opt/localforge-ai-v2/launch-localforge-ai-v2
/home/addrang/.local/share/applications/localforge-ai-v2.desktop
/home/addrang/.local/share/icons/hicolor/512x512/apps/localforge-ai-v2.png
```

On this OSTree/Bazzite host, GNOME desktop launchers must use canonical
`/var/home/addrang` paths. The wrapper must also change into the application
directory so Tauri can find the sidecar:

```sh
#!/usr/bin/env sh
cd /var/home/addrang/.local/opt/localforge-ai-v2 || exit 1
exec ./localforge-ai-v2
```

The desktop entry's `Exec` should point to that wrapper and `Path` should be
`/var/home/addrang/.local/opt/localforge-ai-v2`. Launching without the correct
working directory can make the window briefly appear and then exit because the
sidecar executable is not found.

## 9. Publishing flow

Keep commits focused and inspect staged files before committing. Do not include
generated output, local profiles, downloaded models, or unrelated user changes.

Normal flow:

```bash
git status --short
git diff --check
git add <explicit-files>
git diff --cached
git commit -m "<focused message>"
git push origin main
```

Pushing `main` runs CI. The Linux package workflow can be run manually and also
runs for `v*` tags. For Bazzite installation, download the native tar artifact,
not the AppImage artifact.

## 10. Known limitations and failure modes

- Managed model load, unload, switch, and shutdown cleanup are implemented, but
  llama.cpp is not bundled yet and runtime tuning is not exposed in Settings.
- Settings currently covers temperature and maximum tokens only; changing the
  inference endpoint still requires `LOCALFORGE_API_URL` before launch.
- Workspace access is explicit, read-only WebView file selection. It does not
  retain native file handles between launches and has no editor transactions.
- No functional MCP registry, permission prompts, or audit history yet.
- No RAG, semantic cache, image, or audio pipeline yet.
- The Diff view has no real workspace transaction source yet.
- A renderer-only browser preview cannot establish the native backend.
- A forced process kill can bypass graceful child cleanup. If startup reports a
  port/process conflict after a crash, check for an orphan
  `localforge-backend` process before changing code.
- The AppImage format is currently unsuitable for this Bazzite host; use the
  native bundle.

Avoid hiding these gaps with mock state. Add real functionality vertically: API,
desktop boundary, renderer state, tests, and empty/error handling together.

## 11. Recommended implementation order

Continue the migration in this order unless the user changes priorities:

1. Package or install a verified llama.cpp runtime and add conservative runtime
   tuning plus inference endpoint settings.
2. Replace the session-only workspace picker with a narrow native explorer,
   then add diff preview and approved writes.
3. Add MCP registry IDs, Rust-owned process spawning, permissions, limits, and
   audit logging; keep protocol orchestration in Python.
4. Add RAG and semantic caching.
5. Add image and audio workflows.
6. Add the embedded editor and multi-agent features.

For each phase, keep the default experience sparse and truthful. A feature that
has no configured data should explain what is missing in one short empty state,
not populate the screen with preview content.

## 12. Last clean-reset state

The installed v2 profile was deliberately reset before this handoff. Old Vite
preview processes, orphan sidecars, temporary extracted bundles, screenshots,
the old AppImage, v2 WebKit/session data, and the empty v2 model root were
removed. The desktop app was then launched again and recreated only its fresh
defaults.

Development artifacts such as ignored `node_modules`, renderer `dist`, and a
generated development sidecar may still exist in the source repository. They
are build artifacts, not seeded application state, and must remain untracked.

The separate v1 launcher and data were preserved.
