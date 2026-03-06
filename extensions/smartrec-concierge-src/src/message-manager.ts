import type { ChatMessage } from "./types";

/** Maintains the conversation history for context-aware AI responses */
export class MessageManager {
  private history: ChatMessage[] = [];

  add(role: "user" | "assistant", content: string): void {
    this.history.push({ role, content });
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  getLastN(n: number): ChatMessage[] {
    return this.history.slice(-n);
  }

  clear(): void {
    this.history = [];
  }
}
