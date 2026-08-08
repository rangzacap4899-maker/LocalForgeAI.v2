import { Bot, FileCode2, Image, Mic, Paperclip, Send, Square, Terminal, X } from "lucide-react";
import { useRef, type FormEvent, type KeyboardEvent } from "react";
import type { ChatMessage } from "../types";

interface ChatProps {
  messages: ChatMessage[];
  input: string;
  busy: boolean;
  onInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}

function DemoConversation() {
  return (
    <div className="demo-conversation">
      <div className="chat-date"><span />วันนี้ · 10:42 AM<span /></div>
      <article className="demo-user">
        <p>ช่วยแก้บั๊ก <code>useEffect</code> ที่ทำให้ infinite loop หน่อย ในไฟล์ <code>App.tsx</code> มันเรียก API ซ้ำไม่หยุดเลย</p>
        <small>12 tokens · 10:42 <b>ME</b></small>
      </article>
      <article className="demo-assistant">
        <div className="assistant-mark"><Bot size={14} /></div>
        <div className="assistant-content">
          <div className="thinking"><i /><i /><i />Thinking · วิเคราะห์ dependency array · 2.1s</div>
          <div className="answer-card">
            <p>เจอสาเหตุแล้ว — คุณใส่ <code>fetchData</code> ที่ถูกสร้างใหม่ทุก render ลงใน deps ทำให้ loop</p>
            <p className="muted">วิธีแก้มี 2 แบบ: ใช้ <code>useCallback</code> หรือย้ายฟังก์ชันเข้าไปใน effect เลย แบบที่ 2 จะ clean กว่า</p>
            <div className="code-preview">
              <header><span><FileCode2 size={11} />App.tsx <b>FIXED</b></span><button>Copy</button></header>
              <pre><span className="comment">// Before  ❌ infinite</span>{"\n"}<span className="purple">useEffect</span>(() =&gt; &#123;{"\n"}  <span className="green">fetchData</span>(){"\n"}&#125;, [<span className="amber">fetchData</span>]){"\n\n"}<span className="comment">// After  ✅ stable</span>{"\n"}<span className="purple">useEffect</span>(() =&gt; &#123;{"\n"}  <span className="purple">const</span> load = <span className="purple">async</span> () =&gt; &#123;{"\n"}    <span className="purple">const</span> res = <span className="purple">await</span> <span className="green">fetch</span>(<span className="amber">'/api/data'</span>)</pre>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export function Chat({ messages, input, busy, onInput, onSend, onStop }: ChatProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const submit = (event: FormEvent) => { event.preventDefault(); busy ? onStop() : onSend(); };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!busy) onSend(); }
  };
  return (
    <main className="chat-view">
      <div className="chat-scroll">
        {messages.length === 0 ? <DemoConversation /> : (
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
      <div className="composer-area">
        <form className="artifact-composer" onSubmit={submit}>
          <div className="attachment-chips"><span><FileCode2 size={11} />App.tsx <X size={10} /></span><span className="violet"><Image size={11} />screenshot.png</span></div>
          <textarea ref={textarea} value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={keyDown} placeholder="ถามอะไรก็ได้... พิมพ์ / เพื่อใช้คำสั่ง (เช่น /fix /explain /test)" rows={2} />
          <footer>
            <div className="input-tools"><button type="button"><Paperclip size={13} /></button><button type="button"><Image size={13} /></button><button type="button"><Mic size={13} /></button><span>⌘ ↵ ส่ง · ⇧↵ บรรทัดใหม่ · / คำสั่ง</span></div>
            <div className="send-group"><code>{input.length} · ~{Math.ceil(input.length / 4)} tokens</code><button className={busy ? "stop" : ""} disabled={!busy && !input.trim()}>{busy ? <Square size={12} /> : <Send size={12} />}{busy ? "Stop" : "Send"}</button></div>
          </footer>
        </form>
        <div className="local-note"><Terminal size={9} />Local model · No cloud · Data never leaves device</div>
      </div>
    </main>
  );
}
