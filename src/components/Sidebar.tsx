import { FolderOpen, MessageSquare } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="workspace-sidebar clean-sidebar">
      <div className="sidebar-scroll">
        <section>
          <h3>Workspace</h3>
          <div className="sidebar-empty-row">
            <FolderOpen size={14} />
            <div><strong>ยังไม่ได้เปิดโปรเจกต์</strong><small>เลือกโฟลเดอร์เพื่อเริ่มทำงาน</small></div>
          </div>
        </section>

        <section className="history-section clean-history">
          <h3>Recent</h3>
          <div className="sidebar-empty-row subtle">
            <MessageSquare size={13} />
            <div><strong>ยังไม่มีบทสนทนา</strong><small>แชตใหม่จะแสดงที่นี่</small></div>
          </div>
        </section>
      </div>
      <div className="sidebar-local"><i />Local & private<span>ข้อมูลอยู่ในเครื่อง</span></div>
    </aside>
  );
}
