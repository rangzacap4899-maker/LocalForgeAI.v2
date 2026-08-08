import { AlertCircle, Box, CheckCircle2, Download, FolderInput, HardDrive, RefreshCw, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { LocalModelCandidate, ModelDownload, ModelInfo } from "../types";

interface ModelsViewProps {
  models: ModelInfo[];
  candidates: LocalModelCandidate[];
  downloads: ModelDownload[];
  loading: boolean;
  searching: boolean;
  actionId: string;
  error: string;
  onRefresh: () => void;
  onSearch: () => void;
  onImport: (id: string) => void;
  onDownload: (url: string, fileName: string) => void;
}

const formatBytes = (value: number) => {
  if (value < 1024 ** 2) return `${Math.max(1, Math.round(value / 1024))} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
};

export function ModelsView({ models, candidates, downloads, loading, searching, actionId, error, onRefresh, onSearch, onImport, onDownload }: ModelsViewProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const submitDownload = (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    onDownload(url.trim(), fileName.trim());
    setDownloadOpen(false);
    setUrl(""); setFileName("");
  };

  return (
    <main className="feature-view">
      <div className="feature-page models-page">
        <header className="feature-heading models-heading">
          <div><h1>Models</h1><p>จัดการโมเดล GGUF สำหรับ LocalForge AI v2</p></div>
          <div className="model-actions">
            <button className="model-secondary-action" onClick={onSearch} disabled={searching}><Search size={13} className={searching ? "spin" : ""} />{searching ? "กำลังค้นหา" : "ค้นหาในเครื่อง"}</button>
            <button className="model-primary-action" onClick={() => setDownloadOpen(true)}><Download size={13} />ดาวน์โหลด</button>
          </div>
        </header>

        {error && <div className="model-alert"><AlertCircle size={14} /><span>{error}</span></div>}

        {downloads.length > 0 && (
          <section className="download-queue">
            <header><div><Download size={13} /><strong>Downloads</strong></div><small>{downloads.filter((item) => item.status === "downloading" || item.status === "queued").length} active</small></header>
            {downloads.slice(0, 4).map((item) => {
              const progress = item.totalBytes ? Math.min(100, Math.round(item.downloadedBytes / item.totalBytes * 100)) : null;
              return <article key={item.id}>
                <span className={`download-state ${item.status}`}>{item.status === "complete" ? <CheckCircle2 size={13} /> : item.status === "error" ? <AlertCircle size={13} /> : <Download size={13} />}</span>
                <div><strong>{item.fileName}</strong><small>{item.status === "error" ? item.error : item.status === "complete" ? `${formatBytes(item.downloadedBytes)} · เสร็จแล้ว` : `${formatBytes(item.downloadedBytes)}${item.totalBytes ? ` / ${formatBytes(item.totalBytes)}` : ""}`}</small><i className={progress === null ? "indeterminate" : ""}><b style={progress === null ? undefined : { width: `${progress}%` }} /></i></div>
                <em>{progress === null ? item.status : `${progress}%`}</em>
              </article>;
            })}
          </section>
        )}

        {candidates.length > 0 && (
          <section className="model-section">
            <header><div><HardDrive size={14} /><span><strong>พบในเครื่อง</strong><small>เลือกนำเข้าเพื่อคัดลอกเข้าโปรไฟล์ v2</small></span></div><em>{candidates.length}</em></header>
            <div className="local-model-results">
              {candidates.map((model) => (
                <article key={model.id}>
                  <span><HardDrive size={15} /></span>
                  <div><strong title={model.name}>{model.name}</strong><small>{model.source} · {formatBytes(model.sizeBytes)}</small></div>
                  <button onClick={() => onImport(model.id)} disabled={actionId === model.id}><FolderInput size={12} />{actionId === model.id ? "กำลังนำเข้า" : "นำเข้า"}</button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="model-section managed-models">
          <header><div><Box size={14} /><span><strong>โมเดลของ v2</strong><small>~/.local/share/localforge-ai-v2/models</small></span></div><button onClick={onRefresh} disabled={loading} aria-label="สแกนโมเดลใหม่"><RefreshCw size={12} className={loading ? "spin" : ""} /></button></header>
          {models.length > 0 ? (
            <div className="model-grid clean-model-grid">
              {models.map((model) => (
                <article className="model-card" key={model.id}>
                  <header><span><Box size={16} /></span><em>พร้อมใช้งาน</em></header>
                  <h2 title={model.name}>{model.name}</h2>
                  <code title={model.id}>{model.id}</code>
                  <footer><span>{formatBytes(model.sizeBytes)}</span></footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="models-inline-empty"><Box size={18} /><div><strong>{loading ? "กำลังสแกนโมเดล" : "ยังไม่มีโมเดล"}</strong><small>ค้นหาโมเดลในเครื่อง หรือนำ URL จาก Hugging Face มาดาวน์โหลด</small></div></div>
          )}
        </section>
      </div>

      {downloadOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDownloadOpen(false)}>
          <form className="settings-dialog model-download-dialog" role="dialog" aria-modal="true" aria-labelledby="download-title" onSubmit={submitDownload}>
            <header><div><h2 id="download-title">ดาวน์โหลดโมเดล</h2><p>รองรับลิงก์ไฟล์ GGUF จาก Hugging Face</p></div><button type="button" onClick={() => setDownloadOpen(false)} aria-label="ปิด"><X size={15} /></button></header>
            <label className="dialog-field"><span>Hugging Face URL <small>ใช้ลิงก์ HTTPS ที่ลงท้ายด้วย .gguf</small></span><input type="url" required autoFocus placeholder="https://huggingface.co/…/model.gguf" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
            <label className="dialog-field"><span>ชื่อไฟล์ <small>เว้นว่างเพื่อใช้ชื่อจาก URL</small></span><input type="text" placeholder="model-Q4_K_M.gguf" value={fileName} onChange={(event) => setFileName(event.target.value)} /></label>
            <div className="download-safety"><HardDrive size={13} /><span>ไฟล์จะถูกบันทึกใน model root ของ v2 เท่านั้น</span></div>
            <footer><button type="button" onClick={() => setDownloadOpen(false)}>ยกเลิก</button><button type="submit" disabled={actionId === "download"}>{actionId === "download" ? "กำลังเริ่ม" : "เริ่มดาวน์โหลด"}</button></footer>
          </form>
        </div>
      )}
    </main>
  );
}
