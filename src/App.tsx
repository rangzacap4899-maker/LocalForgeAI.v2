import { useEffect, useRef, useState } from "react";
import { Chat } from "./components/Chat";
import { Inspector } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { connectBackend, getHealth, streamChat } from "./lib/backend";
import type { BackendConnection, ChatMessage } from "./types";

const id = () => crypto.randomUUID();

export default function App() {
  const [connection, setConnection] = useState<BackendConnection | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [llamaOnline, setLlamaOnline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void connectBackend()
      .then(async (next) => {
        if (!active || !next) return;
        setConnection(next);
        for (let attempt = 0; attempt < 20 && active; attempt += 1) {
          try {
            const health = await getHealth(next);
            setBackendOnline(true);
            setLlamaOnline(health.llamaReachable);
            return;
          } catch {
            await new Promise((resolve) => window.setTimeout(resolve, 150));
          }
        }
      })
      .catch((error: unknown) => console.error("Backend startup failed", error));
    return () => { active = false; abort.current?.abort(); };
  }, []);

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    const user: ChatMessage = { id: id(), role: "user", content };
    const assistantId = id();
    const assistant: ChatMessage = { id: assistantId, role: "assistant", content: "", pending: true };
    const context = [...messages, user];
    setMessages([...context, assistant]);
    setInput("");
    setBusy(true);

    if (!connection || !backendOnline) {
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false, error: true, content: "Backend ยังไม่พร้อม กรุณาเปิดผ่าน Tauri desktop shell" } : item));
      setBusy(false);
      return;
    }

    abort.current = new AbortController();
    try {
      await streamChat({
        connection,
        messages: context,
        signal: abort.current.signal,
        onToken: (token) => setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false, content: item.content + token } : item)),
      });
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false } : item));
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false, error: true, content: item.content || (error as Error).message } : item));
      }
    } finally {
      abort.current = null;
      setBusy(false);
    }
  };

  const stop = () => abort.current?.abort();

  return (
    <div className="app-shell">
      <Sidebar />
      <Chat messages={messages} input={input} busy={busy} llamaOnline={llamaOnline} onInput={setInput} onSend={() => void send()} onStop={stop} />
      <Inspector backendOnline={backendOnline} llamaOnline={llamaOnline} />
    </div>
  );
}
