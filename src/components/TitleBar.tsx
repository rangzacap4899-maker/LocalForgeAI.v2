import { Hexagon } from "lucide-react";

export function TitleBar() {
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="traffic-lights" aria-hidden="true"><i /><i /><i /></div>
      <div className="title-brand"><span><Hexagon size={12} /></span><strong>LocalForge-AI</strong><code>PREVIEW · v0.2.0</code></div>
      <div className="title-security"><i />Local&nbsp; · &nbsp;Private</div>
    </header>
  );
}
