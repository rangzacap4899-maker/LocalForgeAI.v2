import { FileCode2 } from "lucide-react";

const before = ["const [data, setData] = useState(null)", "const fetchData = async () => {", "  const res = await fetch(\"/api\")", "  setData(await res.json())", "}", "", "useEffect(() => {", "  fetchData()", "}, [fetchData]) // re-creates every render"];
const after = ["const [data, setData] = useState(null)", "useEffect(() => {", "  const load = async () => {", "    const res = await fetch(\"/api\")", "    setData(await res.json())", "  }", "  load()", "}, []) // stable"];

const Pane = ({ title, lines, modified }: { title: string; lines: string[]; modified?: boolean }) => <div className="diff-pane"><header>{title}</header>{lines.map((line, index) => <div className={(index > 0 && modified) || (index > 6 && !modified) ? (modified ? "added" : "removed") : ""} key={`${line}-${index}`}><span>{index + 14}</span><code>{line || " "}</code></div>)}</div>;

export function DiffView() {
  return <main className="diff-view"><aside><h3>Changes · 3 files</h3>{[{ name: "App.tsx", stat: "+12 -3", type: "M" }, { name: "tauri.conf.json", stat: "+5 -1", type: "M" }, { name: "ChatBubble.tsx", stat: "+42", type: "A" }].map((file) => <button key={file.name}><b>{file.type}</b><span><code>{file.name}</code><small>{file.stat}</small></span></button>)}</aside><section><header><span><FileCode2 size={13} />App.tsx · 2 hunks · AI generated fix</span><div><button>Reject All</button><button className="apply">Apply All</button></div></header><div className="diff-panes"><Pane title="Original · HEAD" lines={before} /><Pane title="Modified · AI Suggestion" lines={after} modified /></div></section></main>;
}
