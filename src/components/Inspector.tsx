import { Icon } from "./Icon";

interface InspectorProps {
  backendOnline: boolean;
  llamaOnline: boolean;
}

export function Inspector({ backendOnline, llamaOnline }: InspectorProps) {
  return (
    <aside className="inspector">
      <div className="inspector-heading"><span>Session</span><button><Icon name="settings" /></button></div>

      <section className="inspector-card model-card">
        <div className="model-orb"><span /></div>
        <div className="model-copy"><small>ACTIVE MODEL</small><strong>{llamaOnline ? "Local model" : "ยังไม่ได้โหลดโมเดล"}</strong><span><i className={llamaOnline ? "online" : ""} />{llamaOnline ? "พร้อมตอบ" : "llama-server offline"}</span></div>
        <Icon name="chevron" className="card-chevron" />
      </section>

      <section className="inspector-card context-card">
        <div className="card-title"><span>Context usage</span><strong>0%</strong></div>
        <div className="context-ring"><div><strong>0</strong><span>/ 8K</span></div></div>
        <div className="context-legend"><span><i className="violet" />Chat</span><span><i className="cyan" />Files</span><span><i className="slate" />Available</span></div>
      </section>

      <section className="inspector-card runtime-card">
        <div className="card-title"><span>Local runtime</span><Icon name="cpu" /></div>
        <div className="runtime-row"><span>Desktop shell</span><strong className={backendOnline ? "ok" : "wait"}>{backendOnline ? "Connected" : "Starting"}</strong></div>
        <div className="runtime-row"><span>Inference</span><strong className={llamaOnline ? "ok" : "muted"}>{llamaOnline ? "Online" : "Offline"}</strong></div>
        <div className="meter"><span style={{ width: llamaOnline ? "68%" : "0%" }} /></div>
        <small>ทรัพยากรทั้งหมดทำงานภายในเครื่อง</small>
      </section>

      <div className="inspector-bottom"><span className="status-pulse" /><span>LocalForge backend {backendOnline ? "ready" : "connecting"}</span></div>
    </aside>
  );
}
