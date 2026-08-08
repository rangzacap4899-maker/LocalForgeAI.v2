import { invoke } from "@tauri-apps/api/core";
import type { BackendConnection, ChatMessage, HealthStatus, ModelInfo } from "../types";

export async function connectBackend(): Promise<BackendConnection | null> {
  if (!("__TAURI_INTERNALS__" in window)) return null;
  return invoke<BackendConnection>("start_backend");
}

export async function getHealth(connection: BackendConnection): Promise<HealthStatus> {
  const response = await fetch(`${connection.baseUrl}/health`, {
    headers: { Authorization: `Bearer ${connection.token}` },
  });
  if (!response.ok) throw new Error(`Backend health check failed (${response.status})`);
  return response.json() as Promise<HealthStatus>;
}

export async function getModels(connection: BackendConnection): Promise<ModelInfo[]> {
  const response = await fetch(`${connection.baseUrl}/api/models`, {
    headers: { Authorization: `Bearer ${connection.token}` },
  });
  if (!response.ok) throw new Error(`Model scan failed (${response.status})`);
  const payload = await response.json() as { models?: ModelInfo[] };
  return Array.isArray(payload.models) ? payload.models : [];
}

interface StreamOptions {
  connection: BackendConnection;
  messages: ChatMessage[];
  signal: AbortSignal;
  onToken: (token: string) => void;
  temperature: number;
  maxTokens: number;
}

export async function streamChat({ connection, messages, signal, onToken, temperature, maxTokens }: StreamOptions): Promise<void> {
  const response = await fetch(`${connection.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
      temperature,
      maxTokens,
    }),
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `Chat request failed (${response.status})`);
  }
  if (!response.body) throw new Error("Streaming response is unavailable");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const applyData = (line: string): boolean => {
    const data = line.trim().replace(/^data:\s*/, "");
    if (!data) return false;
    if (data === "[DONE]") return true;
    try {
      const event = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const token = event.choices?.[0]?.delta?.content;
      if (token) onToken(token);
    } catch {
      // Ignore keepalive and non-JSON server events.
    }
    return false;
  };

  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (applyData(line)) return;
    }
  }
  if (buffer) applyData(buffer);
}
