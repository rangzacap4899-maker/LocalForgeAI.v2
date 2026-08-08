# LocalForge AI v2

LocalForge AI v2 คือ desktop workspace รุ่นใหม่สำหรับใช้งานโมเดล AI ภายในเครื่อง
สร้างด้วย **Tauri 2 + React + TypeScript** และใช้ Python sidecar เชื่อมกับ
`llama-server` ผ่าน OpenAI-compatible API

> Repository นี้แยกจาก LocalForge AI v1 โดยสมบูรณ์ การพัฒนาและติดตั้ง v2
> จะไม่แก้ไขไฟล์ของแอป CustomTkinter รุ่นเดิม

## สถานะ

รุ่น `0.1.0` เป็น foundation ที่ใช้งานได้สำหรับการพัฒนาต่อ ประกอบด้วย:

- responsive desktop UI พร้อม Chat, Sidebar และ Runtime Inspector
- Tauri shell จัดการ lifecycle ของ Python sidecar
- backend bind เฉพาะ `127.0.0.1` และใช้ session token แบบสุ่มทุกครั้ง
- streaming proxy ไปยัง `/v1/chat/completions` ของ `llama-server`
- ตรวจสถานะ backend/inference และค้นหาโมเดล GGUF ภายใน model root ของ v2
- Python unit tests และ GitHub Actions

ยังไม่ใช่ feature parity กับ v1 ฟีเจอร์ Workspace tools, conversation storage,
model manager, RAG, MCP, multimodal และ embedded IDE จะย้ายเข้ามาทีละส่วน

## สถาปัตยกรรม

```text
React / TypeScript UI
        │ Tauri commands
        ▼
Tauri / Rust desktop shell
        │ authenticated loopback HTTP
        ▼
Python sidecar
        │ OpenAI-compatible streaming API
        ▼
llama-server
```

รายละเอียดเพิ่มเติมอยู่ใน [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## ความต้องการสำหรับพัฒนา

- Node.js 22 ขึ้นไป
- Rust stable
- Python 3.10 ขึ้นไป
- Linux: WebKitGTK 4.1 และ Tauri system dependencies

Fedora:

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel libxdo-devel
sudo dnf group install "c-development"
```

Bazzite/OSTree ให้ใช้ชื่อแพ็กเกจเดียวกันผ่าน `rpm-ostree` หรือพัฒนาใน container
ที่มี toolchain ครบ

## เปิดโหมดพัฒนา

```bash
npm install
npm run desktop:dev
```

คำสั่งนี้สร้าง development sidecar wrapper ให้อัตโนมัติและเปิด Tauri window
โดยใช้ endpoint `http://127.0.0.1:8080` เป็นค่าเริ่มต้น เปลี่ยนได้ด้วย:

```bash
LOCALFORGE_API_URL=http://127.0.0.1:9090 npm run desktop:dev
```

## สร้างแพ็กเกจ

production bundle รวม Python backend ด้วย PyInstaller:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements-build.txt
npm install
npm run desktop:build
```

## ทดสอบ

```bash
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -v
python3 -m compileall -q backend scripts
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## ข้อมูลของ v2

โมเดลที่ v2 จัดการในอนาคตจะอยู่ที่:

```text
~/.local/share/localforge-ai-v2/models/
```

สามารถเปลี่ยนด้วย `LOCALFORGE_V2_MODEL_ROOT` ตำแหน่งนี้ตั้งใจแยกจาก v1
เพื่อไม่ให้รุ่นใหม่เปลี่ยนหรือลบข้อมูลเดิมระหว่างพัฒนา

## License

[MIT](LICENSE)
