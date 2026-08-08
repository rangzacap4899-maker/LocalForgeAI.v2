# Architecture

## Design goals

1. Keep model inference local and leave GPU/RAM capacity to `llama-server`.
2. Keep the desktop privilege boundary small and explicit.
3. Migrate v1 capabilities incrementally instead of carrying UI coupling forward.
4. Keep v1 and v2 state, installers and release lifecycles independent.

## Process boundary

The React renderer has no direct shell access. It asks the Rust shell to start
the backend through a narrow Tauri command. Rust selects an unused loopback port,
generates a random session token and starts the bundled sidecar with both values.

The renderer communicates with the sidecar over HTTP on `127.0.0.1`. Every
request requires the random bearer token. Browser requests are accepted only
from the exact Tauri production origins (`http://tauri.localhost` and
`tauri://localhost`); debug builds additionally allow the fixed Vite origin.
Requests without an `Origin` remain available to native diagnostics, while any
other browser origin is rejected before authentication. The sidecar never binds
to a public interface.

## Process ownership

Privileged local processes have one owner: the Rust shell. Rust validates
renderer requests, resolves managed resources under fixed roots, starts and
stops children without invoking a shell, and terminates them with the desktop
session. Python owns AI orchestration and protocol handling, but does not become
a second general-purpose process supervisor. React can request typed operations;
it never supplies an executable path, command line, working directory, or shell
fragment.

| Concern | Owner | Boundary |
| --- | --- | --- |
| Python sidecar lifecycle | Rust | Bundled sidecar name and generated session credentials |
| `llama-server` lifecycle | Rust | Managed relative model ID resolved under the v2 model root |
| Chat/SSE and model discovery | Python | Authenticated loopback API |
| Future MCP child processes | Rust | Registry ID + approved typed arguments only |
| MCP protocol/orchestration | Python | Structured messages over a bounded local channel |
| UI and permission decisions | React | Narrow Tauri commands; no raw paths or shell strings |

The current model runtime discovers `llama-server` from an explicit
`LOCALFORGE_LLAMA_SERVER_BIN`, `PATH`, conventional system locations, or the
read-only v1 source runtime on this development host. Release bundles do not yet
ship llama.cpp themselves. Setting `LOCALFORGE_API_URL` selects an externally
owned endpoint and disables managed load/unload commands.

## Source layout

```text
src/                        React renderer
  components/               presentation components
  lib/backend.ts            typed sidecar client + SSE parsing
src-tauri/                  Rust desktop shell and bundle config
backend/localforge_backend/ Python sidecar
backend/tests/              backend regression tests
scripts/                    development/production sidecar builders
```

## Migration sequence

1. Conversation persistence and generation settings — implemented in the
   renderer profile; endpoint/runtime settings still need a desktop boundary.
2. Model discovery, bounded local search, import, authenticated Hugging Face
   downloads, and Rust-owned `llama-server` load/unload — implemented; bundled
   llama.cpp distribution and runtime tuning remain.
3. Workspace selection and explicit safe reads — implemented for user-selected
   browser files; native explorer and diff-approved transactions remain.
4. RAG and semantic cache
5. MCP permission center, hooks and audit trail
6. Image/audio input
7. Embedded editor and multi-agent workflow

Each phase must add backend tests before its corresponding renderer workflow.
No v1 state is mutated; a future importer will read v1 data and write a separate
v2 copy only after explicit user confirmation.

The first workspace implementation intentionally uses an explicit directory
selection in the WebView. Text-like files up to 300 KB are held in memory and
only files clicked by the user are attached to a prompt. The renderer has no
ambient filesystem permission and cannot write workspace files.

Model search is also intentionally bounded. The sidecar checks conventional
model locations (Downloads, Models, Hugging Face cache, LM Studio cache, and the
v1 model directory), gives the renderer opaque candidate IDs, and copies only a
candidate explicitly selected by the user into the v2 model root. Download URLs
must use HTTPS on Hugging Face-owned hosts. Downloads use a unique partial file,
report progress through authenticated loopback endpoints, reserve free disk
space, and atomically rename only after completion.
