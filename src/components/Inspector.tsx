import { Bot, ShieldCheck } from "lucide-react";

interface InspectorProps { backendOnline: boolean; llamaOnline: boolean; }

export function Inspector({ backendOnline, llamaOnline }: InspectorProps) {
  return (
    <aside className="context-inspector clean-inspector">
      <div className="inspector-scroll">
        <h3>Session</h3>
        <section className="clean-model-card">
          <span><Bot size={16} /></span>
          <div><small>Inference endpoint</small><strong>{llamaOnline ? "Local server" : "No model loaded"}</strong><em><i className={llamaOnline ? "online" : ""} />{llamaOnline ? "Ready" : "llama-server offline"}</em></div>
        </section>

        <section className="clean-privacy-card">
          <ShieldCheck size={15} />
          <div><strong>Backend ภายในเครื่อง</strong><small>เชื่อมผ่าน loopback ที่มี session token</small></div>
        </section>
      </div>
      <div className="inspector-session"><i className={backendOnline ? "online" : ""} /><span>{backendOnline ? "Backend ready" : "Connecting backend"}</span></div>
    </aside>
  );
}
