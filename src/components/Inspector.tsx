import { Bot, CheckCircle2, FileCode2, Gauge, Image, Link2, Route, Wrench } from "lucide-react";

const contextItems = [
  { icon: FileCode2, name: "App.tsx", meta: "L14–L28 · 342 tok", score: 92 },
  { icon: Link2, name: "useEffect docs", meta: "chunk 3/8 · 210 tok", score: 88 },
  { icon: Image, name: "screenshot.png", meta: "vision · 512 tok", score: 76 },
];

interface InspectorProps { backendOnline: boolean; llamaOnline: boolean; }

export function Inspector({ backendOnline, llamaOnline }: InspectorProps) {
  return (
    <aside className="context-inspector">
      <div className="inspector-scroll">
        <section>
          <h3><span><Gauge size={11} />Context Inspector</span><code>5 files · 1.2k tokens</code></h3>
          <div className="context-files">
            {contextItems.map(({ icon: ItemIcon, name, meta, score }) => (
              <div className="context-file" key={name}>
                <span className="file-icon"><ItemIcon size={13} /></span>
                <div><strong>{name}</strong><small>{meta}</small><i><b style={{ width: `${score}%` }} /></i></div>
                <em>{score}%</em>
              </div>
            ))}
          </div>
        </section>

        <section className="token-card">
          <h3><Gauge size={11} />Token Meter</h3>
          <div className="token-body">
            <div className="token-ring"><span>15%</span></div>
            <dl><div><dt>Used</dt><dd>1,248 / 8,192</dd></div><div><dt>Cost</dt><dd>$0.00 local</dd></div><div><dt>Est. remain</dt><dd className="green">~6,944 tok</dd></div></dl>
          </div>
        </section>

        <section>
          <h3><Route size={11} />Model Router</h3>
          <div className="router-card">
            <div><span><i className={llamaOnline ? "online" : ""} />Gemma 4 E4B (active)</span><code>{llamaOnline ? "43 tok/s" : "offline"}</code></div>
            <div className="muted"><span><i />Qwen2.5 Coder (standby)</span><code>on-demand</code></div>
            <p>Router logic: code task → coder model, thai reasoning → gemma · latency aware</p>
          </div>
        </section>

        <section>
          <h3><Wrench size={11} />Tools Called · 2</h3>
          <div className="tool-call"><span><FileCode2 size={12} /></span><div><code>read_file(App.tsx)</code><small><CheckCircle2 size={9} />success · 12ms</small></div></div>
          <div className="tool-call"><span><Image size={12} /></span><div><code>analyze_image(screenshot.png)</code><small><CheckCircle2 size={9} />success · 340ms</small></div></div>
        </section>
      </div>
      <div className="inspector-session"><Bot size={11} /><span>Session · 24m</span><strong>{backendOnline ? "🔒 E2E local" : "Connecting"}</strong></div>
    </aside>
  );
}
