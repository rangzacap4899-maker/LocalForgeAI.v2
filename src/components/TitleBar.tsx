import { Hexagon } from "lucide-react";

export function TitleBar() {
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="traffic-lights" aria-hidden="true"><i /><i /><i /></div>
      <div className="title-brand"><span><Hexagon size={12} /></span><strong>LocalForge-AI</strong><code>TAURI v2 · v0.1.0</code></div>
      <div className="title-security"><i />Local&nbsp; · &nbsp;Offline&nbsp; · &nbsp;Encrypted</div>
    </header>
  );
}
