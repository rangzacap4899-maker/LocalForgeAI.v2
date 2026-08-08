import { GitBranch, Sparkles } from "lucide-react";

interface StatusBarProps { backendOnline: boolean; llamaOnline: boolean; }

export function StatusBar({ backendOnline, llamaOnline }: StatusBarProps) {
  return <footer className="statusbar"><div><span><Sparkles size={10} />Tauri 2 · Rust backend</span><span>Ln 21, Col 18 · UTF-8 · TypeScript</span></div><div><span>{llamaOnline ? "Gemma 4 E4B · 43 tok/s · 1,248 ctx" : "Model offline"}</span><span>● {backendOnline ? "No issues" : "Backend starting"}</span><GitBranch size={10} /></div></footer>;
}
