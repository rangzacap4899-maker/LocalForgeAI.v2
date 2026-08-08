import { ShieldCheck } from "lucide-react";

export function McpView() {
  return (
    <main className="feature-view">
      <div className="feature-page reset-feature-page">
        <header className="feature-heading"><div><h1>MCP Center</h1><p>จัดการเซิร์ฟเวอร์และสิทธิ์เครื่องมือภายในเครื่อง</p></div></header>
        <section className="reset-empty-panel">
          <span><ShieldCheck size={20} /></span>
          <h2>ยังไม่ได้ตั้งค่า MCP</h2>
          <p>ไม่มี server, tool permission หรือ audit event ในโปรไฟล์นี้</p>
        </section>
      </div>
    </main>
  );
}
