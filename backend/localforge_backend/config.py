from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class BackendConfig:
    port: int
    token: str
    llama_url: str
    model_root: Path
    allowed_origins: tuple[str, ...] = ()

    @classmethod
    def create(
        cls,
        port: int,
        token: str,
        llama_url: str,
        allowed_origins: tuple[str, ...] = (),
    ) -> "BackendConfig":
        configured_root = os.environ.get("LOCALFORGE_V2_MODEL_ROOT")
        model_root = (
            Path(configured_root).expanduser()
            if configured_root
            else Path.home() / ".local" / "share" / "localforge-ai-v2" / "models"
        )
        model_root.mkdir(parents=True, exist_ok=True)
        return cls(
            port=port,
            token=token,
            llama_url=llama_url.rstrip("/"),
            model_root=model_root.resolve(),
            allowed_origins=allowed_origins,
        )
