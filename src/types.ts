export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  pending?: boolean;
  error?: boolean;
}

export interface BackendConnection {
  baseUrl: string;
  token: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  llamaReachable: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  sizeBytes: number;
}

export interface LocalModelCandidate extends ModelInfo {
  source: string;
}

export type DownloadStatus = "queued" | "downloading" | "complete" | "error";

export interface ModelDownload {
  id: string;
  fileName: string;
  status: DownloadStatus;
  downloadedBytes: number;
  totalBytes: number | null;
  error: string | null;
}

export interface Attachment {
  id: string;
  name: string;
  content: string;
  sizeBytes: number;
}

export interface WorkspaceFile extends Attachment {
  path: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface GenerationSettings {
  temperature: number;
  maxTokens: number;
}
