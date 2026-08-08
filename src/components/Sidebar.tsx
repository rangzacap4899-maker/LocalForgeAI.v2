import { Icon, type IconName } from "./Icon";

const nav: Array<{ icon: IconName; label: string; active?: boolean }> = [
  { icon: "chat", label: "Chat", active: true },
  { icon: "code", label: "Code" },
  { icon: "files", label: "Workspace" },
  { icon: "database", label: "Knowledge" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Icon name="spark" /></div>
        <div><strong>LocalForge</strong><span>AI workspace · v2</span></div>
      </div>

      <button className="new-chat"><Icon name="plus" />บทสนทนาใหม่<span>⌘ N</span></button>

      <nav className="primary-nav" aria-label="Main navigation">
        {nav.map((item) => (
          <button className={item.active ? "active" : ""} key={item.label}>
            <Icon name={item.icon} />{item.label}{item.active && <i />}
          </button>
        ))}
      </nav>

      <div className="sidebar-section">
        <div className="section-title"><span>ล่าสุด</span><button aria-label="ค้นหาบทสนทนา"><Icon name="search" /></button></div>
        <button className="history active"><span>ออกแบบ Local AI workspace</span><small>เมื่อสักครู่</small></button>
        <button className="history"><span>วิเคราะห์โครงสร้างโปรเจกต์</span><small>เมื่อวาน</small></button>
        <button className="history"><span>ตั้งค่าโมเดล Gemma</span><small>3 วันที่แล้ว</small></button>
      </div>

      <div className="sidebar-footer">
        <div className="privacy"><span className="privacy-dot" /><div><strong>Local & private</strong><small>ข้อมูลอยู่ในเครื่องนี้</small></div></div>
        <button className="settings-button"><Icon name="settings" />ตั้งค่า</button>
      </div>
    </aside>
  );
}
