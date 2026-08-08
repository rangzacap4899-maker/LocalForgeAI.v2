import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { GenerationSettings } from "../types";

interface SettingsDialogProps {
  value: GenerationSettings;
  onClose: () => void;
  onSave: (value: GenerationSettings) => void;
}

export function SettingsDialog({ value, onClose, onSave }: SettingsDialogProps) {
  const [temperature, setTemperature] = useState(value.temperature);
  const [maxTokens, setMaxTokens] = useState(value.maxTokens);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ temperature: Math.min(2, Math.max(0, temperature)), maxTokens: Math.min(32768, Math.max(64, Math.round(maxTokens))) });
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onSubmit={submit}>
        <header><div><h2 id="settings-title">Settings</h2><p>ค่าการสร้างคำตอบสำหรับแชตใหม่</p></div><button type="button" onClick={onClose} aria-label="ปิด"><X size={15} /></button></header>
        <label><span>Temperature <small>0 = แม่นยำ · 2 = สร้างสรรค์</small></span><input type="number" min="0" max="2" step="0.1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} /></label>
        <label><span>Max tokens <small>ความยาวคำตอบสูงสุด</small></span><input type="number" min="64" max="32768" step="64" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} /></label>
        <footer><button type="button" onClick={onClose}>ยกเลิก</button><button type="submit">บันทึก</button></footer>
      </form>
    </div>
  );
}
