import { useEffect, useMemo, useRef, useState } from "react";
import { Chat } from "./components/Chat";
import { DiffView } from "./components/DiffView";
import { Inspector as ContextInspector } from "./components/Inspector";
import { McpView } from "./components/McpView";
import { ModelsView } from "./components/ModelsView";
import { SettingsDialog } from "./components/SettingsDialog";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { Toolbar, type ViewName } from "./components/Toolbar";
import { connectBackend, getHealth, getModels, streamChat } from "./lib/backend";
import { loadConversations, loadSettings, saveConversations, saveSettings } from "./lib/storage";
import type { Attachment, BackendConnection, ChatMessage, Conversation, GenerationSettings, ModelInfo, WorkspaceFile } from "./types";

const MAX_FILE_BYTES = 300_000;
const MAX_ATTACHMENT_BYTES = 1_200_000;
const MAX_WORKSPACE_FILES = 200;
const TEXT_EXTENSIONS = new Set([
  "c", "cc", "cpp", "css", "csv", "go", "h", "hpp", "html", "ini", "java", "js", "json", "jsx",
  "kt", "md", "php", "properties", "py", "rb", "rs", "sh", "sql", "svelte", "toml", "ts", "tsx",
  "txt", "vue", "xml", "yaml", "yml",
]);

const id = () => crypto.randomUUID();
const viewFromUrl = (): ViewName => {
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "models" || value === "mcp" || value === "diff" ? value : "chat";
};
const isReadableFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type.startsWith("text/") || TEXT_EXTENSIONS.has(extension);
};
const chatTitle = (messages: ChatMessage[]) => {
  const first = messages.find((message) => message.role === "user")?.content.trim() || "แชตใหม่";
  return first.length > 42 ? `${first.slice(0, 42)}…` : first;
};

export default function App() {
  const [view, setView] = useState<ViewName>(viewFromUrl);
  const [connection, setConnection] = useState<BackendConnection | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [llamaOnline, setLlamaOnline] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [notice, setNotice] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<GenerationSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const attachedIds = useMemo(() => new Set(attachments.map((file) => file.id)), [attachments]);

  useEffect(() => {
    let active = true;
    let healthTimer = 0;
    const start = async () => {
      try {
        const next = await connectBackend();
        if (!active || !next) return;
        setConnection(next);
        const check = async () => {
          try {
            const health = await getHealth(next);
            if (!active) return;
            setBackendOnline(true);
            setLlamaOnline(health.llamaReachable);
          } catch {
            if (!active) return;
            setBackendOnline(false);
            setLlamaOnline(false);
          }
        };
        await check();
        healthTimer = window.setInterval(() => void check(), 3000);
      } catch (error) {
        console.error("Backend startup failed", error);
        if (active) setNotice("เปิด backend ไม่สำเร็จ กรุณาปิดและเปิดโปรแกรมใหม่");
      }
    };
    void start();
    return () => { active = false; window.clearInterval(healthTimer); abort.current?.abort(); };
  }, []);

  useEffect(() => { saveConversations(conversations); }, [conversations]);
  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;
    setConversations((current) => {
      const next: Conversation = {
        id: activeConversationId,
        title: chatTitle(messages),
        updatedAt: Date.now(),
        messages: messages.map((message) => ({ id: message.id, role: message.role, content: message.content, error: message.error })),
      };
      return [next, ...current.filter((conversation) => conversation.id !== activeConversationId)].slice(0, 30);
    });
  }, [activeConversationId, messages]);

  const scanModels = async () => {
    if (!connection) { setModelsError("Backend ยังไม่พร้อม"); return; }
    setModelsLoading(true); setModelsError("");
    try { setModels(await getModels(connection)); }
    catch (error) { setModelsError((error as Error).message); }
    finally { setModelsLoading(false); }
  };
  useEffect(() => { if (view === "models" && connection) void scanModels(); }, [view, connection]);

  const addFiles = async (files: FileList | File[]) => {
    const selected = Array.from(files).filter(isReadableFile);
    let total = attachments.reduce((sum, file) => sum + file.sizeBytes, 0);
    const added: Attachment[] = [];
    let skipped = Array.from(files).length - selected.length;
    for (const file of selected) {
      if (file.size > MAX_FILE_BYTES || total + file.size > MAX_ATTACHMENT_BYTES) { skipped += 1; continue; }
      added.push({ id: id(), name: file.name, sizeBytes: file.size, content: await file.text() });
      total += file.size;
    }
    setAttachments((current) => [...current, ...added]);
    setNotice(added.length ? `แนบแล้ว ${added.length} ไฟล์${skipped ? ` · ข้าม ${skipped} ไฟล์` : ""}` : "รองรับไฟล์ข้อความไม่เกิน 300 KB ต่อไฟล์");
  };

  const openWorkspace = async (files: FileList) => {
    const candidates = Array.from(files)
      .filter((file) => isReadableFile(file) && file.size <= MAX_FILE_BYTES)
      .filter((file) => !/(^|\/)(\.git|node_modules|dist|target|__pycache__)(\/|$)/.test(file.webkitRelativePath))
      .slice(0, MAX_WORKSPACE_FILES);
    const next: WorkspaceFile[] = [];
    for (const file of candidates) {
      const path = file.webkitRelativePath || file.name;
      next.push({ id: `workspace:${path}`, name: file.name, path, sizeBytes: file.size, content: await file.text() });
    }
    const root = next[0]?.path.split("/")[0] ?? "";
    setWorkspaceFiles(next);
    setWorkspaceName(root);
    setAttachments([]);
    setNotice(next.length ? `เปิด ${root} แล้ว · พบไฟล์ข้อความ ${next.length} ไฟล์` : "ไม่พบไฟล์ข้อความที่รองรับในโฟลเดอร์นี้");
  };

  const toggleWorkspaceFile = (file: WorkspaceFile) => {
    if (attachments.some((item) => item.id === file.id)) {
      setAttachments((current) => current.filter((item) => item.id !== file.id));
      return;
    }
    const total = attachments.reduce((sum, item) => sum + item.sizeBytes, 0);
    if (total + file.sizeBytes > MAX_ATTACHMENT_BYTES) { setNotice("ไฟล์แนบรวมต้องไม่เกิน 1.2 MB"); return; }
    setAttachments((current) => [...current, file]);
  };

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    const user: ChatMessage = { id: id(), role: "user", content };
    const assistantId = id();
    const conversationId = activeConversationId ?? id();
    const displayContext = [...messages, user];
    const attachmentContext = attachments.map((file) => `\n\n--- FILE: ${file.name} ---\n${file.content}\n--- END FILE ---`).join("");
    const apiContext = [...messages, { ...user, content: `${content}${attachmentContext}` }];
    setActiveConversationId(conversationId);
    setMessages([...displayContext, { id: assistantId, role: "assistant", content: "", pending: true }]);
    setInput(""); setAttachments([]); setNotice(""); setBusy(true);
    if (!connection || !backendOnline) {
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false, error: true, content: "Backend ยังไม่พร้อม กรุณาเปิดผ่าน Tauri desktop shell" } : item));
      setBusy(false); return;
    }
    abort.current = new AbortController();
    try {
      await streamChat({ connection, messages: apiContext, signal: abort.current.signal, temperature: settings.temperature, maxTokens: settings.maxTokens, onToken: (token) => setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false, content: item.content + token } : item)) });
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false } : item));
    } catch (error) {
      const aborted = (error as Error).name === "AbortError";
      setMessages((current) => current.map((item) => {
        if (item.id !== assistantId) return item;
        if (aborted) return { ...item, pending: false };
        return { ...item, pending: false, error: true, content: item.content || (error as Error).message };
      }));
    } finally { abort.current = null; setBusy(false); }
  };

  const newChat = () => {
    abort.current?.abort();
    setActiveConversationId(null); setMessages([]); setInput(""); setAttachments([]); setNotice(""); setView("chat");
  };
  const selectConversation = (conversationId: string) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    abort.current?.abort();
    setActiveConversationId(conversation.id); setMessages(conversation.messages); setAttachments([]); setNotice(""); setView("chat");
  };
  const selectView = (next: ViewName) => {
    setView(next);
    const url = next === "chat" ? window.location.pathname : `${window.location.pathname}?view=${next}`;
    window.history.replaceState(null, "", url);
  };
  const updateSettings = (next: GenerationSettings) => { setSettings(next); saveSettings(next); setSettingsOpen(false); setNotice("บันทึก Settings แล้ว"); };

  return (
    <div className="desktop-stage">
      <div className="desktop-window">
        <TitleBar />
        <Toolbar active={view} setActive={selectView} llamaOnline={llamaOnline} onSettings={() => setSettingsOpen(true)} />
        <div className={`workspace-layout ${view !== "chat" ? "feature-mode" : ""}`}>
          <Sidebar conversations={conversations} activeConversationId={activeConversationId} workspaceName={workspaceName} workspaceFiles={workspaceFiles} attachedIds={attachedIds} onNewChat={newChat} onSelectConversation={selectConversation} onWorkspaceFiles={(files) => void openWorkspace(files)} onToggleWorkspaceFile={toggleWorkspaceFile} />
          {view === "chat" && <Chat messages={messages} input={input} busy={busy} attachments={attachments} notice={notice} onInput={setInput} onSend={() => void send()} onStop={() => abort.current?.abort()} onFiles={(files) => void addFiles(files)} onRemoveAttachment={(fileId) => setAttachments((current) => current.filter((file) => file.id !== fileId))} />}
          {view === "models" && <ModelsView models={models} loading={modelsLoading} error={modelsError} onRefresh={() => void scanModels()} />}
          {view === "mcp" && <McpView />}
          {view === "diff" && <DiffView />}
          {view === "chat" && <ContextInspector backendOnline={backendOnline} llamaOnline={llamaOnline} />}
        </div>
        <StatusBar backendOnline={backendOnline} llamaOnline={llamaOnline} />
      </div>
      {settingsOpen && <SettingsDialog value={settings} onClose={() => setSettingsOpen(false)} onSave={updateSettings} />}
    </div>
  );
}
