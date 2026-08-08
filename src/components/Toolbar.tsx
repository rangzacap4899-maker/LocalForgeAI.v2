import { Bot, Database, GitCompareArrows, MessageSquare, Settings, ShieldCheck } from "lucide-react";

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
        <span><strong>{llamaOnline ? "Local model" : "No model loaded"}</strong><small>{llamaOnline ? "Connected · local inference" : "llama-server offline"}</small></span>
        <i className={llamaOnline ? "online" : ""} />
      </div>

      <nav className="view-tabs" aria-label="Workspace views">
        {tabs.map(({ id, label, icon: TabIcon }) => (
          <button className={active === id ? "active" : ""} onClick={() => setActive(id)} key={id}>
            <TabIcon size={13} />{label}
          </button>
        ))}
      </nav>

      <button className="round-button toolbar-settings" aria-label="Settings"><Settings size={15} /></button>
    </div>
  );
}
