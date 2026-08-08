import { Sparkles } from "lucide-react";

interface StatusBarProps { backendOnline: boolean; llamaOnline: boolean; }

export function StatusBar({ backendOnline, llamaOnline }: StatusBarProps) {
  return <footer className="statusbar clean-statusbar"><span><Sparkles size={10} />LocalForge AI v2</span><span>{llamaOnline ? "Local model ready" : backendOnline ? "Backend ready" : "Starting…"}</span></footer>;
}
