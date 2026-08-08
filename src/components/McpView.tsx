import { Ban, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

const tools = [
  { server: "filesystem", tool: "read_file", desc: "อ่านไฟล์ใน workspace เท่านั้น", risk: "low", status: "Allow" },
  { server: "filesystem", tool: "write_file", desc: "แก้ไขไฟล์ ต้องขออนุญาต", risk: "medium", status: "Ask" },
  { server: "git", tool: "git_commit", desc: "สร้าง commit อัตโนมัติ", risk: "medium", status: "Ask" },
  { server: "shell", tool: "run_command", desc: "รันคำสั่ง shell (อันตราย)", risk: "high", status: "Block" },
  { server: "postgres", tool: "query_db", desc: "คิวรี่ฐานข้อมูล dev", risk: "high", status: "Ask" },
];

export function McpView() {
  return (
    <main className="feature-view"><div className="feature-page mcp-page">
      <header className="feature-heading"><div><h1><ShieldCheck size={20} />MCP Permission Center</h1><p>ควบคุมสิทธิ์ Model Context Protocol · ทุก tool call ตรวจสอบได้ · Audit log แบบ local-first</p></div></header>
      <div className="permission-summary">
        <article className="allow"><span><CheckCircle2 size={12} />Allowed · 3 servers</span><strong>12</strong><small>tools whitelisted</small></article>
        <article className="ask"><span><Clock3 size={12} />Ask every time · 2</span><strong>5</strong><small>tools require approval</small></article>
        <article><span><Ban size={12} />Blocked</span><strong>2</strong><small>tools denied</small></article>
      </div>
      <section className="tool-table"><header><strong>MCP Servers & Tools</strong><code>tauri-plugin-mcp · sandbox enabled</code></header>
        {tools.map((item) => <div className="tool-row" key={`${item.server}-${item.tool}`}><i className={item.risk} /><div><code><span>{item.server}</span> / {item.tool}</code><small>{item.desc} · workspace scoped</small></div><em>{item.risk}</em><select defaultValue={item.status}><option>Allow</option><option>Ask</option><option>Block</option></select></div>)}
      </section>
    </div></main>
  );
}
