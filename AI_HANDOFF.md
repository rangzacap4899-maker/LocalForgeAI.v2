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
- Current application version: `0.1.0`

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
- `llama-server offline` is expected until a server is listening at the
  configured URL.

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
- model downloads accept only HTTPS Hugging Face URLs, report progress, reject
  HTML pages and unsafe filenames, preserve a 256 MB disk reserve, and move a
  unique partial file into place atomically;
- backend and llama health are polled every three seconds;
- SSE parsing handles `[DONE]`, partial final buffers, and an aborted response
  without turning it into an error message.

The app is not yet at feature parity with v1. MCP and Diff are honest empty
states. Models can be discovered, imported, and downloaded but cannot yet be
loaded into a supervised `llama-server`. Workspace selection and prompt context
work, but native filesystem writes and diff transactions have not been
implemented.

Known-good repository baseline:

- branch: `main`
- baseline commit before this document: `4a2f04b`
- CI: `https://github.com/rangzacap4899-maker/LocalForgeAI.v2/actions/runs/31242451511`
- Linux packaging:
  `https://github.com/rangzacap4899-maker/LocalForgeAI.v2/actions/runs/31242451487`

## 3. Architecture

```text
React + TypeScript renderer
        |
        | Tauri IPC: narrow desktop-only commands
        v
Rust / Tauri shell
        |
        | starts sidecar and injects a random bearer token
        v
Python loopback sidecar (127.0.0.1, random available port)
        |
        | OpenAI-compatible HTTP/SSE
        v
llama-server (default http://127.0.0.1:8080)
```

Responsibilities:

- React renders the interface and consumes the sidecar API. It must not receive
  general shell or filesystem access.
- Rust owns the desktop lifecycle, starts the Python sidecar, reads its startup
  metadata, exposes the minimal connection details to the renderer, and stops
  the child process when the desktop window is destroyed.
- Python provides a small authenticated API, discovers local `.gguf` files, and
  proxies streaming chat requests to `llama-server`.
- `llama-server` is currently external. v2 does not yet download, configure, or
  supervise it.

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

The current sidecar returns `Access-Control-Allow-Origin: *`. Authentication and
loopback binding are the primary controls today. Tightening origin validation is
a recommended hardening task before broader distribution.

## 6. Runtime configuration and data

Defaults:

- llama-server URL: `http://127.0.0.1:8080`
- model root: `~/.local/share/localforge-ai-v2/models`
- WebKit/app profile: `~/.local/share/io.localforge.LocalForgeAI.v2`

The model endpoint recursively discovers `.gguf` files and excludes projector
files. A healthy sidecar with no llama-server returns a successful health
response with `llamaReachable: false`; this is not a sidecar failure.

Local search checks these conventional locations when present:

- `~/Downloads`, `~/Models`, and `~/models`
- `~/.cache/huggingface/hub`
- `~/.cache/lm-studio/models`
- `~/.local/share/localforge-ai/models` (read-only v1 source)

Search does not recursively scan the entire home directory. Import copies a
selected candidate into the v2 model root and never deletes or alters its source.

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

- No built-in `llama-server` lifecycle or model loading yet.
- No model load, unload, or `llama-server` supervision yet. Download and local
  import are implemented.
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

1. Add inference endpoint settings and restart/reconnect behavior.
2. Add model selection plus `llama-server` load/unload and lifecycle management
   (discovery, import, and download are already implemented).
3. Replace the session-only workspace picker with a narrow native explorer,
   then add diff preview and approved writes.
4. Add RAG and semantic caching.
5. Add MCP permissions and audit logging.
6. Add image and audio workflows.
7. Add the embedded editor and multi-agent features.

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
