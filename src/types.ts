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
