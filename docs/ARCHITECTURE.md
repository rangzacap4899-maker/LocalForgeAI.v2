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
request requires the random bearer token. The sidecar never binds to a public
interface. Its first responsibility is to validate requests and proxy streaming
responses from the configured local `llama-server`.

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
2. Model discovery — implemented; download and `llama-server` lifecycle remain.
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
