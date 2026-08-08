import { Box, Download, Gauge, MoreHorizontal, Plus, Server } from "lucide-react";

const models = [
  { name: "Gemma 4 E4B IT", size: "4.2 GB", quant: "Q4_K_M", context: "8192", status: "loaded" },
  { name: "Qwen2.5 Coder 7B", size: "4.7 GB", quant: "Q5_K_M", context: "32768", status: "available" },
  { name: "Llama 3.2 3B Instruct", size: "1.9 GB", quant: "Q4_0", context: "8192", status: "downloading" },
];

export function ModelsView() {
  return (
    <main className="feature-view">
      <div className="feature-page">
        <header className="feature-heading"><div><h1>Model Manager</h1><p>จัดการโมเดล local · รองรับ GGUF, Safetensors · ผ่าน llama.cpp</p></div><button><Plus size={13} />Browse Hub</button></header>
        <div className="model-grid">
          {models.map((model) => (
            <article className={`model-card ${model.status}`} key={model.name}>
              <header><span><Box size={16} /></span><em>{model.status}</em></header>
              <div><h2>{model.name}</h2><code>{model.quant} · {model.size} · ctx {model.context}</code></div>
              {model.status === "downloading" && <div className="download-progress"><i><b /></i><span>64% <small>2.1 MB/s</small></span></div>}
              <footer><button>{model.status === "loaded" ? "Unload" : "Load"}</button><button><MoreHorizontal size={13} /></button></footer>
            </article>
          ))}
        </div>
        <section className="runtime-stats"><h3><Gauge size={12} />Runtime Stats</h3><div>
          <article><span>Context Usage</span><strong>1,248 / 8,192</strong><i><b style={{ width: "15%" }} /></i></article>
          <article><span>Tokens / sec</span><strong>43.2 tok/s</strong><small>↑ 12% vs last</small></article>
          <article><span>VRAM</span><strong>3.8 / 8 GB</strong><small className="amber">Optimized</small></article>
          <article><span>Model Layer Offload</span><strong>35 / 42 layers → GPU</strong><small><Server size={9} />Vulkan acceleration</small></article>
        </div></section>
        <button className="download-model"><Download size={14} />ดาวน์โหลดโมเดลใหม่</button>
      </div>
    </main>
  );
}
