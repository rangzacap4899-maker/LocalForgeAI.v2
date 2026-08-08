from __future__ import annotations

import argparse
import hmac
import json
import shutil
import sys
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from localforge_backend import __version__
from localforge_backend.config import BackendConfig
from localforge_backend.models import discover_models

MAX_REQUEST_BYTES = 2_000_000


class LocalForgeServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], config: BackendConfig):
        super().__init__(address, LocalForgeHandler)
        self.config = config


class LocalForgeHandler(BaseHTTPRequestHandler):
    server: LocalForgeServer
    protocol_version = "HTTP/1.1"

    def log_message(self, message: str, *args: Any) -> None:
        print(
            json.dumps({"level": "info", "message": message % args}, ensure_ascii=False),
            file=sys.stderr,
            flush=True,
        )

    def _cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(encoded)

    def _authorized(self) -> bool:
        expected = f"Bearer {self.server.config.token}"
        received = self.headers.get("Authorization", "")
        return hmac.compare_digest(received, expected)

    def _require_auth(self) -> bool:
        if self._authorized():
            return True
        self._json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
        return False

    def _read_json(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("invalid content length") from error
        if length <= 0 or length > MAX_REQUEST_BYTES:
            raise ValueError("request body is empty or too large")
        value = json.loads(self.rfile.read(length))
        if not isinstance(value, dict):
            raise ValueError("request body must be a JSON object")
        return value

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self._cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if not self._require_auth():
            return
        if self.path == "/health":
            self._health()
        elif self.path == "/api/models":
            self._json(
                HTTPStatus.OK,
                {"models": discover_models(self.server.config.model_root)},
            )
        else:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self._require_auth():
            return
        if self.path == "/api/chat":
            self._chat()
        else:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def _health(self) -> None:
        reachable = False
        try:
            with urllib.request.urlopen(
                f"{self.server.config.llama_url}/health", timeout=0.7
            ) as response:
                reachable = 200 <= response.status < 300
        except (OSError, urllib.error.URLError):
            pass
        self._json(
            HTTPStatus.OK,
            {
                "status": "ok",
                "version": __version__,
                "llamaReachable": reachable,
            },
        )

    def _chat(self) -> None:
        try:
            payload = self._read_json()
            messages = payload.get("messages")
            if not isinstance(messages, list) or not messages:
                raise ValueError("messages must be a non-empty array")
            request_body = json.dumps(
                {
                    "messages": messages,
                    "stream": True,
                    "temperature": payload.get("temperature", 0.7),
                    "max_tokens": payload.get("maxTokens", 1024),
                }
            ).encode("utf-8")
        except (ValueError, json.JSONDecodeError) as error:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return

        request = urllib.request.Request(
            f"{self.server.config.llama_url}/v1/chat/completions",
            data=request_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            upstream = urllib.request.urlopen(request, timeout=900)
        except urllib.error.HTTPError as error:
            detail = error.read(16_000).decode("utf-8", errors="replace")
            self._json(HTTPStatus.BAD_GATEWAY, {"error": detail or str(error)})
            return
        except (OSError, urllib.error.URLError) as error:
            self._json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"error": f"llama-server is unavailable: {error}"},
            )
            return

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self._cors_headers()
        self.end_headers()
        try:
            with upstream:
                shutil.copyfileobj(upstream, self.wfile, length=16_384)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            self.close_connection = True


def create_server(config: BackendConfig) -> LocalForgeServer:
    return LocalForgeServer(("127.0.0.1", config.port), config)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LocalForge AI v2 backend")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--llama-url", default="http://127.0.0.1:8080")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    config = BackendConfig.create(args.port, args.token, args.llama_url)
    server = create_server(config)
    print(
        json.dumps({"status": "ready", "port": server.server_port}),
        flush=True,
    )
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
