import { FileCode2, FolderOpen, MessageSquare, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Conversation, WorkspaceFile } from "../types";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  workspaceName: string;
  workspaceFiles: WorkspaceFile[];
  attachedIds: Set<string>;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onWorkspaceFiles: (files: FileList) => void;
  onToggleWorkspaceFile: (file: WorkspaceFile) => void;
}

export function Sidebar({ conversations, activeConversationId, workspaceName, workspaceFiles, attachedIds, onNewChat, onSelectConversation, onWorkspaceFiles, onToggleWorkspaceFile }: SidebarProps) {
  const folderInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
    folderInput.current?.setAttribute("directory", "");
  }, []);

  return (
    <aside className="workspace-sidebar clean-sidebar">
      <div className="sidebar-scroll">
        <section>
          <h3>Workspace <button className="sidebar-icon-button" onClick={() => folderInput.current?.click()} aria-label="เลือกโฟลเดอร์"><FolderOpen size={12} /></button></h3>
          <input ref={folderInput} className="visually-hidden" type="file" multiple onChange={(event) => event.target.files && onWorkspaceFiles(event.target.files)} />
          {workspaceFiles.length === 0 ? (
            <button className="sidebar-empty-row sidebar-empty-button" onClick={() => folderInput.current?.click()}>
              <FolderOpen size={14} />
              <span><strong>ยังไม่ได้เปิดโปรเจกต์</strong><small>เลือกโฟลเดอร์เพื่อเริ่มทำงาน</small></span>
            </button>
          ) : (
            <div className="workspace-file-list">
              <strong className="workspace-name">{workspaceName}</strong>
              {workspaceFiles.slice(0, 80).map((file) => (
                <button className={attachedIds.has(file.id) ? "workspace-file active" : "workspace-file"} key={file.id} onClick={() => onToggleWorkspaceFile(file)} title={file.path}>
                  <FileCode2 size={12} /><span>{file.path.replace(`${workspaceName}/`, "")}</span>
                </button>
              ))}
              {workspaceFiles.length > 80 && <small className="workspace-more">+{workspaceFiles.length - 80} ไฟล์</small>}
            </div>
          )}
        </section>

        <section className="history-section clean-history">
          <h3>Recent <button className="sidebar-icon-button" onClick={onNewChat} aria-label="แชตใหม่"><Plus size={12} /></button></h3>
          {conversations.length === 0 ? (
            <div className="sidebar-empty-row subtle">
              <MessageSquare size={13} />
              <div><strong>ยังไม่มีบทสนทนา</strong><small>แชตใหม่จะแสดงที่นี่</small></div>
            </div>
          ) : conversations.map((conversation) => (
            <button className={`history-card ${activeConversationId === conversation.id ? "active" : ""}`} key={conversation.id} onClick={() => onSelectConversation(conversation.id)}>
              <MessageSquare size={12} /><span>{conversation.title}</span>
            </button>
          ))}
        </section>
      </div>
      <div className="sidebar-local"><i />Local & private<span>ข้อมูลอยู่ในเครื่อง</span></div>
    </aside>
  );
}
