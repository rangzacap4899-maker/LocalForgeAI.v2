from __future__ import annotations

import os
import shutil
import threading
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

from localforge_backend.models import default_search_roots, discover_external_models


class ModelOperations:
    def __init__(
        self,
        model_root: Path,
        search_roots: list[tuple[str, Path]] | None = None,
        allowed_hosts: set[str] | None = None,
    ) -> None:
        self.model_root = model_root.resolve()
        self.search_roots = search_roots or default_search_roots(Path.home())
        self.allowed_hosts = allowed_hosts or {"huggingface.co", "hf.co"}
        self._lock = threading.Lock()
        self._candidates: dict[str, Path] = {}
        self._downloads: dict[str, dict[str, Any]] = {}

    def search(self) -> list[dict[str, object]]:
        models, candidates = discover_external_models(
            self.search_roots, self.model_root
        )
        with self._lock:
            self._candidates = candidates
        return models

    def import_candidate(self, candidate_id: str) -> dict[str, object]:
        with self._lock:
            source = self._candidates.get(candidate_id)
        if source is None:
            raise ValueError("model candidate is unavailable; search again")
        try:
            source = source.resolve(strict=True)
        except OSError as error:
            raise ValueError("model file is no longer available") from error
        if source.suffix.casefold() != ".gguf":
            raise ValueError("only GGUF model files can be imported")

        destination = self.model_root / source.name
        if destination.exists():
            raise FileExistsError("a model with this filename already exists")
        self.model_root.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        stat = destination.stat()
        return {
            "id": destination.name,
            "name": destination.name,
            "sizeBytes": stat.st_size,
        }

    def start_download(self, url: str, requested_name: str | None = None) -> dict[str, Any]:
        url, filename = self._validate_download(url, requested_name)
        destination = self.model_root / filename
        if destination.exists():
            raise FileExistsError("a model with this filename already exists")

        job_id = uuid.uuid4().hex
        job: dict[str, Any] = {
            "id": job_id,
            "fileName": filename,
            "status": "queued",
            "downloadedBytes": 0,
            "totalBytes": None,
            "error": None,
        }
        with self._lock:
            if any(
                current["fileName"] == filename
                and current["status"] in {"queued", "downloading"}
                for current in self._downloads.values()
            ):
                raise FileExistsError("this model is already downloading")
            self._downloads[job_id] = job
        snapshot = dict(job)
        threading.Thread(
            target=self._download,
            args=(job_id, url, destination),
            daemon=True,
            name=f"model-download-{job_id[:8]}",
        ).start()
        return snapshot

    def downloads(self) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(job) for job in reversed(self._downloads.values())]

    def _validate_download(self, url: str, requested_name: str | None) -> tuple[str, str]:
        try:
            parsed = urllib.parse.urlsplit(url)
        except ValueError as error:
            raise ValueError("invalid model URL") from error
        host = (parsed.hostname or "").casefold()
        allowed = host in self.allowed_hosts or any(
            host.endswith(f".{allowed_host}") for allowed_host in self.allowed_hosts
        )
        if parsed.scheme != "https" or not allowed:
            raise ValueError("downloads are limited to HTTPS Hugging Face URLs")

        if "/blob/" in parsed.path:
            parsed = parsed._replace(path=parsed.path.replace("/blob/", "/resolve/", 1))
            url = urllib.parse.urlunsplit(parsed)

        name = (requested_name or "").strip()
        if not name:
            name = urllib.parse.unquote(Path(parsed.path).name)
        if (
            not name
            or len(name) > 180
            or Path(name).name != name
            or not name.casefold().endswith(".gguf")
        ):
            raise ValueError("filename must be a valid .gguf filename")
        return url, name

    def _update(self, job_id: str, **values: Any) -> None:
        with self._lock:
            self._downloads[job_id].update(values)

    def _download(self, job_id: str, url: str, destination: Path) -> None:
        part = self.model_root / f".{destination.name}.{job_id}.part"
        self.model_root.mkdir(parents=True, exist_ok=True)
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": "LocalForge-AI-v2/0.1.0"}
            )
            self._update(job_id, status="downloading")
            with urllib.request.urlopen(request, timeout=900) as response:
                header = response.headers.get("Content-Length")
                total = int(header) if header and header.isdigit() else None
                content_type = (response.headers.get("Content-Type") or "").casefold()
                if "text/html" in content_type:
                    raise ValueError("URL points to a web page instead of a GGUF file")
                if total is not None:
                    available = shutil.disk_usage(self.model_root).free
                    if available < total + 256 * 1024 * 1024:
                        raise OSError("not enough free disk space for this model")
                self._update(job_id, totalBytes=total)
                downloaded = 0
                with part.open("xb") as output:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        output.write(chunk)
                        downloaded += len(chunk)
                        self._update(job_id, downloadedBytes=downloaded)
            if total is not None and downloaded != total:
                raise OSError("download ended before the advertised file size")
            if destination.exists():
                raise FileExistsError("a model with this filename already exists")
            os.replace(part, destination)
            self._update(job_id, status="complete", downloadedBytes=destination.stat().st_size)
        except Exception as error:  # background jobs surface a bounded message to the UI
            self._update(job_id, status="error", error=str(error)[:500])
            try:
                part.unlink(missing_ok=True)
            except OSError:
                pass
