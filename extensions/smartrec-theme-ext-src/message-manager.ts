import type { ChatMessage } from "./types";

/** Manages conversation history state for the concierge chat */
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
