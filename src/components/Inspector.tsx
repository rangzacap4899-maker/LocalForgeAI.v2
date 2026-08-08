import { Bot, ShieldCheck } from "lucide-react";

interface InspectorProps { backendOnline: boolean; llamaOnline: boolean; }

export function Inspector({ backendOnline, llamaOnline }: InspectorProps) {
  return (
    <aside className="context-inspector clean-inspector">
      <div className="inspector-scroll">
        <h3>Session</h3>
        <section className="clean-model-card">
          <span><Bot size={16} /></span>
          <div><small>Active model</small><strong>{llamaOnline ? "Local model" : "No model loaded"}</strong><em><i className={llamaOnline ? "online" : ""} />{llamaOnline ? "Ready" : "llama-server offline"}</em></div>
        </section>

        <section className="clean-privacy-card">
          <ShieldCheck size={15} />
          <div><strong>ทำงานภายในเครื่อง</strong><small>ไม่มีข้อมูลส่งขึ้น cloud</small></div>
        </section>
      </div>
      <div className="inspector-session"><i className={backendOnline ? "online" : ""} /><span>{backendOnline ? "Backend ready" : "Connecting backend"}</span></div>
    </aside>
  );
}
