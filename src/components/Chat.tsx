import { Bot, FileText, FolderSearch, Paperclip, Send, Sparkles, Square, X } from "lucide-react";
import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import type { Attachment, ChatMessage } from "../types";

interface ChatProps {
  messages: ChatMessage[];
  input: string;
  busy: boolean;
  attachments: Attachment[];
  notice: string;
  onInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFiles: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
}

export function Chat({ messages, input, busy, attachments, notice, onInput, onSend, onStop, onFiles, onRemoveAttachment }: ChatProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" }); }, [messages]);
  const submit = (event: FormEvent) => { event.preventDefault(); busy ? onStop() : onSend(); };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!busy) onSend(); }
  };
  const usePrompt = (prompt: string) => { onInput(prompt); textarea.current?.focus(); };

  return (
    <main className="chat-view clean-chat">
      <div className="chat-scroll" ref={scroll}>
        {messages.length === 0 ? (
          <section className="clean-empty-state">
            <div className="clean-brand-mark"><Sparkles size={22} /></div>
            <h1>มีอะไรให้ช่วย?</h1>
            <p>ถามเกี่ยวกับโค้ด หรือให้ช่วยทำงานกับโปรเจกต์ในเครื่อง</p>
            <div className="clean-prompts">
              <button onClick={() => usePrompt("อธิบายโครงสร้างโปรเจกต์นี้ให้หน่อย")}><FolderSearch size={14} />อธิบายโปรเจกต์</button>
              <button onClick={() => usePrompt("ช่วยตรวจหา bug ในไฟล์ที่เปิดอยู่")}><Bot size={14} />ตรวจโค้ดที่เปิดอยู่</button>
            </div>
          </section>
        ) : (
          <div className="live-messages">
            {messages.map((message) => (
              <article className={`live-message ${message.role} ${message.error ? "error" : ""}`} key={message.id}>
                {message.role === "assistant" && <span className="assistant-mark"><Bot size={13} /></span>}
                <div><small>{message.role === "assistant" ? "LOCALFORGE" : "YOU"}</small><p>{message.content || (message.pending ? "กำลังคิด…" : "")}</p></div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="composer-area clean-composer-area">
        <form className="artifact-composer clean-composer" onSubmit={submit}>
          {attachments.length > 0 && <div className="attachment-list">{attachments.map((file) => <span key={file.id}><FileText size={11} />{file.name}<button type="button" onClick={() => onRemoveAttachment(file.id)} aria-label={`นำ ${file.name} ออก`}><X size={10} /></button></span>)}</div>}
          <textarea ref={textarea} value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={keyDown} placeholder="ถาม LocalForge…" rows={2} />
          <footer>
            <input ref={fileInput} className="visually-hidden" type="file" multiple onChange={(event) => { if (event.target.files) onFiles(event.target.files); event.target.value = ""; }} />
            <button type="button" className="clean-attach" aria-label="แนบไฟล์" onClick={() => fileInput.current?.click()}><Paperclip size={14} /></button>
            <span className="clean-shortcut">Enter เพื่อส่ง · Shift+Enter ขึ้นบรรทัดใหม่</span>
            <button className={`clean-send ${busy ? "stop" : ""}`} disabled={!busy && !input.trim()}>{busy ? <Square size={12} /> : <Send size={13} />}</button>
          </footer>
        </form>
        <div className={`local-note ${notice ? "notice" : ""}`}>{notice || "Local model · ข้อมูลอยู่ในเครื่อง"}</div>
      </div>
    </main>
  );
}
