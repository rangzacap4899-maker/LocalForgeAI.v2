import { ChevronDown, FileCode2, FileJson, Folder, FolderOpen, MessageSquare, Plus } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="workspace-sidebar clean-sidebar">
      <div className="sidebar-scroll">
        <section>
          <h3>Workspace</h3>
          <button className="workspace-select"><i /><code>localforge-ai</code><ChevronDown size={12} /></button>
        </section>

        <section className="explorer">
          <h3>Explorer <Plus size={11} /></h3>
          <div className="tree-row root"><ChevronDown size={11} /><FolderOpen size={13} className="violet" /><code>src</code></div>
          <div className="tree-branch">
            <div className="tree-row"><ChevronDown size={11} /><Folder size={13} /><code>components</code></div>
            <button className="tree-file active"><FileCode2 size={12} /><code>App.tsx</code></button>
            <button className="tree-file"><FileCode2 size={12} /><code>Chat.tsx</code></button>
          </div>
          <button className="tree-file top"><FileCode2 size={12} /><code>main.rs</code></button>
          <button className="tree-file top"><FileJson size={12} /><code>tauri.conf.json</code></button>
        </section>

        <section className="history-section clean-history">
          <h3>Recent</h3>
          <button className="history-card"><MessageSquare size={12} /><span>ช่วยแก้โค้ด useEffect</span></button>
          <button className="history-card"><MessageSquare size={12} /><span>ออกแบบ RAG pipeline</span></button>
        </section>
      </div>
      <div className="sidebar-local"><i />Local & private<span>ข้อมูลอยู่ในเครื่อง</span></div>
    </aside>
  );
}
