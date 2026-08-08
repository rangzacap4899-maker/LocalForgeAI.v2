# LocalForge AI v2 roadmap

LocalForge AI v2 uses capability-based milestones instead of promising a date
before the safety and parity criteria are met. Until 1.0, v1 remains the
recommended primary application and v2 remains an independently installed
Preview.

## 0.2 — Local model runtime (current)

- exact Tauri CORS allowlist for the authenticated loopback sidecar;
- local search, safe import, and Hugging Face GGUF downloads;
- Rust-owned `llama-server` load, unload, switch, and desktop shutdown cleanup;
- clear Preview status in the desktop interface;
- external inference endpoint remains available as an explicitly selected mode.

Exit criteria: backend, renderer, and Rust checks pass; a native Linux package
can discover a runtime, load a managed GGUF, serve health, and unload cleanly.

## 0.3 — Workspace transactions and Diff

- narrow native workspace handles rather than ambient filesystem access;
- proposed edits become immutable diff transactions;
- writes require explicit file-level approval and detect stale source content;
- rollback/audit information exists for every applied transaction.

Exit criteria: Diff View contains only real proposed changes and no chat output
can write directly to disk.

## 0.4 — MCP permission center

- typed MCP registry with per-server capability declarations;
- Rust owns child process spawning and termination;
- Python owns MCP protocol adapters and orchestration;
- explicit permission prompts, revocation, timeouts, output limits, and audit log.

Exit criteria: no renderer-controlled executable, path, or shell fragment can
reach process creation.

## 0.5 — Knowledge and multimodal

- local RAG ingestion with source visibility and deletion controls;
- semantic cache with inspectable scope and invalidation;
- image/audio input with model capability checks and bounded temporary storage.

## 0.6 — Embedded development workspace

- embedded editor connected to the 0.3 transaction boundary;
- task and multi-agent workflows using the same MCP permission model;
- recovery behavior for interrupted model, tool, and edit operations.

## 1.0 — Feature-parity migration candidate

1. v1 parity checklist is complete for models, chat, workspace edits, Diff, MCP,
   RAG, multimodal, and embedded IDE workflows.
2. Security review covers loopback authentication, origins, process creation,
   filesystem transactions, model downloads, and MCP permissions.
3. A user-confirmed importer copies selected v1 settings/data into separate v2
   storage without mutating or deleting v1.
4. Native packages pass clean-install, upgrade, crash-recovery, and uninstall
   tests on supported systems.
5. The UI removes the Preview label only after all gates above pass.
