from __future__ import annotations

import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from localforge_backend.config import BackendConfig
from localforge_backend.models import discover_models
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


class BackendServerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        config = BackendConfig(
            port=0,
            token="test-secret",
            llama_url="http://127.0.0.1:1",
            model_root=Path(self.temp.name),
        )
        self.server = create_server(config)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp.cleanup()

    def request(self, path: str, token: str = "test-secret") -> urllib.request.Request:
        return urllib.request.Request(
            self.base_url + path,
            headers={"Authorization": f"Bearer {token}"},
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


class MockLlamaHandler(BaseHTTPRequestHandler):
    def log_message(self, _message: str, *_args: object) -> None:
        pass

    def do_GET(self) -> None:  # noqa: N802
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers["Content-Length"])
        payload = json.loads(self.rfile.read(length))
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
            data=json.dumps({"messages": [{"role": "user", "content": "hi"}]}).encode(),
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


if __name__ == "__main__":
    unittest.main()
