import { ChevronDown, Code2, FileCode2, FileJson, Folder, FolderOpen, Gauge, Pin, Plus, Settings2 } from "lucide-react";

const Meter = ({ label, value, tone }: { label: string; value: number; tone: string }) => (
  <div className="system-meter">
    <div><span><Gauge size={9} />{label}</span><strong>{value}%</strong></div>
    <div className="system-track"><i style={{ width: `${value}%`, background: tone }} /></div>
  </div>
);

export function Sidebar() {
  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-scroll">
        <section>
          <h3>Workspace</h3>
          <button className="workspace-select"><i /><code>localforge-ai</code><ChevronDown size={12} /></button>
          <button className="workspace-row"><i />rag-playground</button>
          <button className="workspace-row"><i />thai-llm-finetune</button>
          <button className="workspace-row muted"><Plus size={11} />New workspace</button>
        </section>

        <section className="explorer">
          <h3>Explorer <span><Plus size={11} /><b>···</b></span></h3>
          <div className="tree-row root"><ChevronDown size={11} /><FolderOpen size={13} className="violet" /><code>src</code></div>
          <div className="tree-branch">
            <div className="tree-row"><ChevronDown size={11} /><Folder size={13} /><code>components</code></div>
            <button className="tree-file active"><FileCode2 size={12} /><code>App.tsx</code></button>
            <button className="tree-file"><FileCode2 size={12} /><code>ChatBubble.tsx</code></button>
            <button className="tree-file"><FileCode2 size={12} /><code>DiffViewer.tsx</code></button>
          </div>
          <button className="tree-file top"><Code2 size={12} /><code>main.rs</code></button>
          <button className="tree-file top"><FileJson size={12} /><code>tauri.conf.json</code></button>
        </section>

        <section className="history-section">
          <h3>Chat History</h3>
          <div className="pinned-label"><Pin size={9} />Pinned</div>
          <button className="history-card"><span>ช่วยแก้โค้ด useEffect infinite loop</span><small>10:42</small></button>
          <button className="history-line">Design RAG pipeline architecture</button>
          <button className="history-line">Explain Tauri command permissions</button>
        </section>
      </div>

      <section className="system-panel">
        <h3><Settings2 size={10} />System</h3>
        <Meter label="CPU" value={42} tone="#20c997" />
        <Meter label="RAM" value={68} tone="#9a69f5" />
        <Meter label="VRAM" value={84} tone="#f2aa18" />
        <small>Vulkan · Radeon GPU · Local</small>
      </section>
    </aside>
  );
}
