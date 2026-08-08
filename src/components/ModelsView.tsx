import { Box, RefreshCw } from "lucide-react";
import type { ModelInfo } from "../types";

interface ModelsViewProps {
  models: ModelInfo[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

const formatBytes = (value: number) => {
  if (value < 1024 ** 2) return `${Math.max(1, Math.round(value / 1024))} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
};

export function ModelsView({ models, loading, error, onRefresh }: ModelsViewProps) {
  return (
    <main className="feature-view">
      <div className="feature-page reset-feature-page">
        <header className="feature-heading">
          <div><h1>Models</h1><p>โมเดล GGUF ที่พบในพื้นที่ของ LocalForge AI v2</p></div>
          <button onClick={onRefresh} disabled={loading}><RefreshCw size={13} className={loading ? "spin" : ""} />{loading ? "กำลังสแกน" : "สแกนใหม่"}</button>
        </header>
        {models.length > 0 ? (
          <section className="model-grid clean-model-grid">
            {models.map((model) => (
              <article className="model-card" key={model.id}>
                <header><span><Box size={16} /></span><em>พบในเครื่อง</em></header>
                <h2 title={model.name}>{model.name}</h2>
                <code title={model.id}>{model.id}</code>
                <footer><span>{formatBytes(model.sizeBytes)}</span></footer>
              </article>
            ))}
          </section>
        ) : (
          <section className="reset-empty-panel">
            <span><Box size={20} /></span>
            <h2>{error ? "สแกนโมเดลไม่สำเร็จ" : loading ? "กำลังค้นหาโมเดล" : "ยังไม่มีโมเดล"}</h2>
            <p>{error || "วางไฟล์ GGUF ในโฟลเดอร์ด้านล่าง แล้วกดสแกนใหม่"}</p>
            <code>~/.local/share/localforge-ai-v2/models</code>
          </section>
        )}
      </div>
    </main>
  );
}
