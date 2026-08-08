import { Bot, ChevronDown, Database, Ellipsis, GitCompareArrows, MessageSquare, Search, Settings, ShieldCheck } from "lucide-react";

export type ViewName = "chat" | "models" | "mcp" | "diff";

const tabs: Array<{ id: ViewName; label: string; icon: typeof MessageSquare }> = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "models", label: "Models", icon: Database },
  { id: "mcp", label: "MCP Center", icon: ShieldCheck },
  { id: "diff", label: "Diff View", icon: GitCompareArrows },
];

interface ToolbarProps {
  active: ViewName;
  setActive: (view: ViewName) => void;
  llamaOnline: boolean;
}

export function Toolbar({ active, setActive, llamaOnline }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="model-pill">
        <span className="model-icon"><Bot size={15} /></span>
        <span><strong>{llamaOnline ? "Local model" : "Gemma 4 E4B IT"}</strong><small>Q4_K_M · 4.2GB · ctx 8k</small></span>
        <ChevronDown size={12} /><i className={llamaOnline ? "online" : ""} />
      </div>
      <button className="unload-button"><span className="pause-icon" />{llamaOnline ? "Unload" : "Load"}</button>

      <nav className="view-tabs" aria-label="Workspace views">
        {tabs.map(({ id, label, icon: TabIcon }) => (
          <button className={active === id ? "active" : ""} onClick={() => setActive(id)} key={id}>
            <TabIcon size={13} />{label}
          </button>
        ))}
      </nav>

      <div className="toolbar-actions">
        <button className="command-status"><Search size={13} /><span>{active === "chat" ? "Chat" : tabs.find((tab) => tab.id === active)?.label}</span><i />Ready</button>
        <button className="round-button" aria-label="Settings"><Settings size={15} /></button>
        <button className="round-button" aria-label="More"><Ellipsis size={16} /></button>
      </div>
    </div>
  );
}
