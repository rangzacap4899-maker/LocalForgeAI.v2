from __future__ import annotations

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
