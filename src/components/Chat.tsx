import { useRef, type FormEvent, type KeyboardEvent } from "react";
import type { ChatMessage } from "../types";
import { Icon } from "./Icon";

interface ChatProps {
  messages: ChatMessage[];
  input: string;
  busy: boolean;
  llamaOnline: boolean;
  onInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}

const suggestions = [
  ["code", "สร้างโปรเจกต์", "ช่วยวางโครงเว็บแอปใหม่"],
  ["files", "อ่าน Workspace", "สรุปไฟล์และสถาปัตยกรรม"],
  ["spark", "ถามโมเดล", "อธิบายโค้ดหรือช่วยแก้บั๊ก"],
] as const;

export function Chat({ messages, input, busy, llamaOnline, onInput, onSend, onStop }: ChatProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const submit = (event: FormEvent) => { event.preventDefault(); busy ? onStop() : onSend(); };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy) onSend();
    }
  };

  return (
    <main className="chat-panel">
      <header className="topbar">
        <div><span className="eyebrow">CURRENT SESSION</span><h1>ออกแบบ Local AI workspace</h1></div>
        <div className={`runtime-pill ${llamaOnline ? "online" : ""}`}><span />{llamaOnline ? "Local GPU" : "Model offline"}</div>
      </header>

      <div className={`messages ${messages.length === 0 ? "empty" : ""}`}>
        {messages.length === 0 ? (
          <section className="welcome">
            <div className="welcome-mark"><Icon name="spark" /></div>
            <span className="welcome-kicker">PRIVATE BY DESIGN</span>
            <h2>วันนี้อยากสร้างอะไร?</h2>
            <p>สนทนา เขียนโค้ด และทำงานกับไฟล์ผ่านโมเดลที่รันอยู่ในเครื่องของคุณ</p>
            <div className="suggestions">
              {suggestions.map(([icon, title, copy]) => (
                <button key={title} onClick={() => { onInput(copy); textarea.current?.focus(); }}>
                  <Icon name={icon} /><span><strong>{title}</strong><small>{copy}</small></span><Icon name="chevron" />
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="message-list">
            {messages.map((message) => (
              <article className={`message ${message.role} ${message.error ? "error" : ""}`} key={message.id}>
                <div className="avatar">{message.role === "assistant" ? <Icon name="spark" /> : "ร"}</div>
                <div className="bubble">
                  <span className="message-name">{message.role === "assistant" ? "LocalForge" : "คุณ"}</span>
                  <p>{message.content || (message.pending ? "กำลังคิด…" : "")}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="composer-wrap">
        <form className="composer" onSubmit={submit}>
          <textarea ref={textarea} value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={keyDown} placeholder="ส่งข้อความถึงโมเดลในเครื่อง…" rows={2} />
          <div className="composer-actions">
            <div><button type="button" className="icon-button" aria-label="แนบไฟล์"><Icon name="paperclip" /></button><span>Enter เพื่อส่ง · Shift+Enter ขึ้นบรรทัดใหม่</span></div>
            <button className={`send-button ${busy ? "stop" : ""}`} type="submit" disabled={!busy && !input.trim()}>
              <Icon name={busy ? "stop" : "send"} />
            </button>
          </div>
        </form>
        <small className="disclaimer">LocalForge อาจตอบผิดได้ โปรดตรวจสอบโค้ดและข้อมูลสำคัญก่อนใช้งาน</small>
      </div>
    </main>
  );
}
