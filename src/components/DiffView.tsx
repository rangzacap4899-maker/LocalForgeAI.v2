import { GitCompareArrows } from "lucide-react";

export function DiffView() {
  return (
    <main className="feature-view">
      <div className="feature-page reset-feature-page">
        <header className="feature-heading"><div><h1>Diff View</h1><p>ตรวจสอบการเปลี่ยนแปลงก่อนนำไปใช้</p></div></header>
        <section className="reset-empty-panel">
          <span><GitCompareArrows size={20} /></span>
          <h2>ไม่มีการเปลี่ยนแปลง</h2>
          <p>diff ที่สร้างจากงานของคุณจะแสดงในพื้นที่นี้</p>
        </section>
      </div>
    </main>
  );
}
