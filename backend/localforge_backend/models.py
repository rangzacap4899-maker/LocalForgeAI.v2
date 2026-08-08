from __future__ import annotations

import hashlib
from pathlib import Path


def discover_models(root: Path) -> list[dict[str, object]]:
    """Return local GGUF models without exposing arbitrary filesystem paths."""
    models: list[dict[str, object]] = []
    try:
        candidates = sorted(root.rglob("*.gguf"), key=lambda path: path.name.casefold())
    except OSError:
        return models

    for path in candidates:
        if "mmproj" in path.name.casefold() or "projector" in path.name.casefold():
            continue
        try:
            stat = path.stat()
            relative = path.resolve().relative_to(root.resolve())
        except (OSError, ValueError):
            continue
        models.append(
            {
                "id": relative.as_posix(),
                "name": path.name,
                "sizeBytes": stat.st_size,
            }
        )
    return models


def default_search_roots(home: Path) -> list[tuple[str, Path]]:
    """Return bounded, conventional locations where desktop model files live."""
    return [
        ("Downloads", home / "Downloads"),
        ("Models", home / "Models"),
        ("Models", home / "models"),
        ("Hugging Face", home / ".cache" / "huggingface" / "hub"),
        ("LM Studio", home / ".cache" / "lm-studio" / "models"),
        ("LocalForge v1", home / ".local" / "share" / "localforge-ai" / "models"),
    ]


def discover_external_models(
    roots: list[tuple[str, Path]], managed_root: Path, limit: int = 200
) -> tuple[list[dict[str, object]], dict[str, Path]]:
    """Find GGUF files in approved roots and expose opaque IDs instead of paths."""
    models: list[dict[str, object]] = []
    candidates: dict[str, Path] = {}
    seen: set[Path] = set()
    managed = managed_root.resolve()

    for source, root in roots:
        if len(models) >= limit or not root.is_dir():
            continue
        try:
            paths = root.rglob("*.gguf")
            for path in paths:
                if len(models) >= limit:
                    break
                lowered = path.name.casefold()
                if "mmproj" in lowered or "projector" in lowered:
                    continue
                try:
                    resolved = path.resolve()
                    if resolved in seen or resolved.is_relative_to(managed):
                        continue
                    stat = resolved.stat()
                except OSError:
                    continue
                seen.add(resolved)
                identifier = hashlib.sha256(str(resolved).encode("utf-8")).hexdigest()[:24]
                candidates[identifier] = resolved
                models.append(
                    {
                        "id": identifier,
                        "name": resolved.name,
                        "sizeBytes": stat.st_size,
                        "source": source,
                    }
                )
        except OSError:
            continue

    models.sort(key=lambda item: str(item["name"]).casefold())
    return models, candidates
