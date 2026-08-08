from __future__ import annotations

import json
import io
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from localforge_backend.config import BackendConfig
from localforge_backend.model_operations import ModelOperations
from localforge_backend.models import discover_external_models, discover_models
from localforge_backend.server import create_server


class ModelDiscoveryTests(unittest.TestCase):
    def test_discovers_models_and_ignores_projectors(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "nested").mkdir()
            (root / "nested" / "model-Q4.gguf").write_bytes(b"weights")
            (root / "nested" / "model-mmproj.gguf").write_bytes(b"projector")
            self.assertEqual(
                discover_models(root),
                [{"id": "nested/model-Q4.gguf", "name": "model-Q4.gguf", "sizeBytes": 7}],
            )

    def test_external_search_uses_opaque_ids_and_skips_managed_models(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            external = root / "downloads"
            managed = root / "managed"
            external.mkdir()
            managed.mkdir()
            (external / "outside.gguf").write_bytes(b"outside")
            (managed / "inside.gguf").write_bytes(b"inside")
            models, candidates = discover_external_models(
                [("Downloads", external), ("Managed", managed)], managed
            )
            self.assertEqual(len(models), 1)
            self.assertEqual(models[0]["name"], "outside.gguf")
            self.assertEqual(models[0]["source"], "Downloads")
            self.assertNotIn(str(external), str(models[0]))
            self.assertEqual(candidates[models[0]["id"]], external / "outside.gguf")


class FakeDownloadResponse:
    def __init__(self, payload: bytes):
        self.payload = io.BytesIO(payload)
        self.headers = {"Content-Length": str(len(payload))}

    def __enter__(self) -> "FakeDownloadResponse":
        return self

    def __exit__(self, *_args: object) -> None:
        pass

    def read(self, size: int = -1) -> bytes:
        return self.payload.read(size)


class ModelOperationsTests(unittest.TestCase):
    def test_imports_a_searched_model_without_exposing_a_path(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            managed = root / "managed"
            external = root / "downloads"
            managed.mkdir()
            external.mkdir()
            (external / "model.gguf").write_bytes(b"weights")
            operations = ModelOperations(managed, [("Downloads", external)])
            candidate = operations.search()[0]
            imported = operations.import_candidate(str(candidate["id"]))
            self.assertEqual(imported["name"], "model.gguf")
            self.assertEqual((managed / "model.gguf").read_bytes(), b"weights")

    def test_downloads_a_hugging_face_model_with_progress(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            operations = ModelOperations(root, allowed_hosts={"models.test"})
            with patch(
                "localforge_backend.model_operations.urllib.request.urlopen",
                return_value=FakeDownloadResponse(b"model-weights"),
            ) as open_url:
                job = operations.start_download(
                    "https://models.test/repository/blob/main/model.gguf"
                )
                deadline = time.monotonic() + 2
                while time.monotonic() < deadline:
                    current = operations.downloads()[0]
                    if current["status"] in {"complete", "error"}:
                        break
                    time.sleep(0.01)
                request = open_url.call_args.args[0]
            self.assertEqual(current["id"], job["id"])
            self.assertEqual(current["status"], "complete")
            self.assertEqual(current["downloadedBytes"], 13)
            self.assertIn("/resolve/", request.full_url)
            self.assertEqual((root / "model.gguf").read_bytes(), b"model-weights")

    def test_rejects_non_hugging_face_downloads(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            operations = ModelOperations(Path(folder))
            with self.assertRaisesRegex(ValueError, "Hugging Face"):
                operations.start_download("https://example.com/model.gguf")


class BackendServerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.external = tempfile.TemporaryDirectory()
        config = BackendConfig(
            port=0,
            token="test-secret",
            llama_url="http://127.0.0.1:1",
            model_root=Path(self.temp.name),
        )
        self.server = create_server(config)
        self.server.model_operations.search_roots = [
            ("Downloads", Path(self.external.name))
        ]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp.cleanup()
        self.external.cleanup()

    def request(self, path: str, token: str = "test-secret") -> urllib.request.Request:
        return urllib.request.Request(
            self.base_url + path,
            headers={"Authorization": f"Bearer {token}"},
        )

    def post(self, path: str, payload: dict[str, object]) -> urllib.request.Request:
        return urllib.request.Request(
            self.base_url + path,
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": "Bearer test-secret",
                "Content-Type": "application/json",
            },
            method="POST",
        )

    def test_health_requires_token(self) -> None:
        with self.assertRaises(urllib.error.HTTPError) as context:
            urllib.request.urlopen(self.request("/health", "wrong"), timeout=2)
        self.assertEqual(context.exception.code, 401)
        context.exception.close()

    def test_health_reports_backend_even_without_llama(self) -> None:
        with urllib.request.urlopen(self.request("/health"), timeout=2) as response:
            payload = json.load(response)
        self.assertEqual(payload["status"], "ok")
        self.assertFalse(payload["llamaReachable"])

    def test_models_endpoint_returns_discovered_models(self) -> None:
        (Path(self.temp.name) / "local-Q4.gguf").write_bytes(b"weights")
        with urllib.request.urlopen(self.request("/api/models"), timeout=2) as response:
            payload = json.load(response)
        self.assertEqual(
            payload["models"],
            [{"id": "local-Q4.gguf", "name": "local-Q4.gguf", "sizeBytes": 7}],
        )

    def test_searches_and_imports_a_local_model(self) -> None:
        source = Path(self.external.name) / "found.gguf"
        source.write_bytes(b"weights")
        with urllib.request.urlopen(self.request("/api/models/search"), timeout=2) as response:
            candidate = json.load(response)["models"][0]
        self.assertEqual(candidate["source"], "Downloads")
        with urllib.request.urlopen(
            self.post("/api/models/import", {"id": candidate["id"]}), timeout=2
        ) as response:
            imported = json.load(response)["model"]
        self.assertEqual(imported["name"], "found.gguf")
        self.assertEqual((Path(self.temp.name) / "found.gguf").read_bytes(), b"weights")

    def test_download_endpoint_rejects_untrusted_hosts(self) -> None:
        with self.assertRaises(urllib.error.HTTPError) as context:
            urllib.request.urlopen(
                self.post(
                    "/api/models/download",
                    {"url": "https://example.com/model.gguf"},
                ),
                timeout=2,
            )
        self.assertEqual(context.exception.code, 400)
        context.exception.close()


class MockLlamaHandler(BaseHTTPRequestHandler):
    last_payload: dict[str, object] | None = None

    def log_message(self, _message: str, *_args: object) -> None:
        pass

    def do_GET(self) -> None:  # noqa: N802
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers["Content-Length"])
        payload = json.loads(self.rfile.read(length))
        type(self).last_payload = payload
        assert payload["stream"] is True
        body = b'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n'
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class ChatProxyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        MockLlamaHandler.last_payload = None
        self.upstream = ThreadingHTTPServer(("127.0.0.1", 0), MockLlamaHandler)
        self.upstream_thread = threading.Thread(target=self.upstream.serve_forever, daemon=True)
        self.upstream_thread.start()
        config = BackendConfig(
            port=0,
            token="test-secret",
            llama_url=f"http://127.0.0.1:{self.upstream.server_port}",
            model_root=Path(self.temp.name),
        )
        self.backend = create_server(config)
        self.backend_thread = threading.Thread(target=self.backend.serve_forever, daemon=True)
        self.backend_thread.start()

    def tearDown(self) -> None:
        self.backend.shutdown()
        self.backend.server_close()
        self.upstream.shutdown()
        self.upstream.server_close()
        self.backend_thread.join(timeout=2)
        self.upstream_thread.join(timeout=2)
        self.temp.cleanup()

    def test_streams_openai_events_from_llama_server(self) -> None:
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.backend.server_port}/api/chat",
            data=json.dumps(
                {
                    "messages": [{"role": "user", "content": "hi"}],
                    "temperature": 0.2,
                    "maxTokens": 256,
                }
            ).encode(),
            headers={
                "Authorization": "Bearer test-secret",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=2) as response:
            body = response.read().decode()
        self.assertIn('"content":"hello"', body)
        self.assertIn("data: [DONE]", body)
        self.assertEqual(MockLlamaHandler.last_payload["temperature"], 0.2)
        self.assertEqual(MockLlamaHandler.last_payload["max_tokens"], 256)

    def test_rejects_invalid_generation_settings(self) -> None:
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.backend.server_port}/api/chat",
            data=json.dumps(
                {
                    "messages": [{"role": "user", "content": "hi"}],
                    "temperature": 9,
                    "maxTokens": 0,
                }
            ).encode(),
            headers={
                "Authorization": "Bearer test-secret",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with self.assertRaises(urllib.error.HTTPError) as context:
            urllib.request.urlopen(request, timeout=2)
        self.assertEqual(context.exception.code, 400)
        context.exception.close()


if __name__ == "__main__":
    unittest.main()
