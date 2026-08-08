import type { Conversation, GenerationSettings } from "../types";

const CONVERSATIONS_KEY = "localforge-v2:conversations";
const SETTINGS_KEY = "localforge-v2:generation-settings";

export const DEFAULT_SETTINGS: GenerationSettings = {
  temperature: 0.7,
  maxTokens: 1024,
};

export function loadConversations(): Conversation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Conversation => {
        if (!item || typeof item !== "object") return false;
        const value = item as Partial<Conversation>;
        return typeof value.id === "string"
          && typeof value.title === "string"
          && typeof value.updatedAt === "number"
          && Array.isArray(value.messages);
      })
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 30)));
  } catch (error) {
    console.error("Cannot save conversation history", error);
  }
}

export function loadSettings(): GenerationSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<GenerationSettings>;
    const temperature = Number(parsed.temperature);
    const maxTokens = Number(parsed.maxTokens);
    return {
      temperature: Number.isFinite(temperature) && temperature >= 0 && temperature <= 2
        ? temperature
        : DEFAULT_SETTINGS.temperature,
      maxTokens: Number.isInteger(maxTokens) && maxTokens >= 64 && maxTokens <= 32768
        ? maxTokens
        : DEFAULT_SETTINGS.maxTokens,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GenerationSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
