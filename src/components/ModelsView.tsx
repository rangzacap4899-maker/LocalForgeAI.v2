import { Box } from "lucide-react";

export function ModelsView() {
  return (
    <main className="feature-view">
      <div className="feature-page reset-feature-page">
        <header className="feature-heading"><div><h1>Models</h1><p>โมเดลภายในเครื่องของ LocalForge AI v2</p></div></header>
        <section className="reset-empty-panel">
          <span><Box size={20} /></span>
          <h2>ยังไม่มีโมเดล</h2>
          <p>เมื่อเชื่อม Model Manager แล้ว โมเดล GGUF ในเครื่องจะแสดงที่นี่</p>
          <code>~/.local/share/localforge-ai-v2/models</code>
        </section>
      </div>
    </main>
  );
}
