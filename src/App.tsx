import { useEffect, useRef, useState } from "react";
import { Chat } from "./components/Chat";
import { Inspector as ContextInspector } from "./components/Inspector";
import { DiffView } from "./components/DiffView";
import { McpView } from "./components/McpView";
import { ModelsView } from "./components/ModelsView";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { Toolbar, type ViewName } from "./components/Toolbar";
import { connectBackend, getHealth, streamChat } from "./lib/backend";
import type { BackendConnection, ChatMessage } from "./types";

const id = () => crypto.randomUUID();
const viewFromUrl = (): ViewName => {
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "models" || value === "mcp" || value === "diff" ? value : "chat";
};
export default function App() {
  const [view, setView] = useState<ViewName>(viewFromUrl);
  const [connection, setConnection] = useState<BackendConnection | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [llamaOnline, setLlamaOnline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void connectBackend().then(async (next) => {
      if (!active || !next) return;
      setConnection(next);
      for (let attempt = 0; attempt < 20 && active; attempt += 1) {
        try {
          const health = await getHealth(next);
          setBackendOnline(true);
          setLlamaOnline(health.llamaReachable);
          return;
        } catch { await new Promise((resolve) => window.setTimeout(resolve, 150)); }
      }
    }).catch((error: unknown) => console.error("Backend startup failed", error));
    return () => { active = false; abort.current?.abort(); };
  }, []);

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    const user: ChatMessage = { id: id(), role: "user", content };
    const assistantId = id();
    const context = [...messages, user];
    setMessages([...context, { id: assistantId, role: "assistant", content: "", pending: true }]);
    setInput(""); setBusy(true);
    if (!connection || !backendOnline) {
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false, error: true, content: "Backend ยังไม่พร้อม กรุณาเปิดผ่าน Tauri desktop shell" } : item));
      setBusy(false); return;
    }
    abort.current = new AbortController();
    try {
      await streamChat({ connection, messages: context, signal: abort.current.signal, onToken: (token) => setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false, content: item.content + token } : item)) });
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false } : item));
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false, error: true, content: item.content || (error as Error).message } : item));
    } finally { abort.current = null; setBusy(false); }
  };

  const selectView = (next: ViewName) => {
    setView(next);
    const url = next === "chat" ? window.location.pathname : `${window.location.pathname}?view=${next}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="desktop-stage">
      <div className="desktop-window">
        <TitleBar />
        <Toolbar active={view} setActive={selectView} llamaOnline={llamaOnline} />
        <div className={`workspace-layout ${view !== "chat" ? "feature-mode" : ""}`}>
          <Sidebar />
          {view === "chat" && <Chat messages={messages} input={input} busy={busy} onInput={setInput} onSend={() => void send()} onStop={() => abort.current?.abort()} />}
          {view === "models" && <ModelsView />}
          {view === "mcp" && <McpView />}
          {view === "diff" && <DiffView />}
          {view === "chat" && <ContextInspector backendOnline={backendOnline} llamaOnline={llamaOnline} />}
        </div>
        <StatusBar backendOnline={backendOnline} llamaOnline={llamaOnline} />
      </div>
    </div>
  );
}
