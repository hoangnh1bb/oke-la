import type { ChatMessage, ConciergeMeta, SSEChunk } from "./types";

/** Handles SSE fetch communication with the /apps/smartrec/chat backend endpoint */
export class ChatService {
  constructor(private appProxy: string) {}

  async sendMessage(
    message: string,
    history: ChatMessage[],
    meta: ConciergeMeta,
    onChunk: (chunk: SSEChunk) => void,
    signal?: AbortSignal
  ): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.appProxy}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversationHistory: history,
          shop: meta.shop,
          productId: meta.productId ?? null,
          customerId: meta.customerId ?? null,
        }),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      onChunk({ type: "error", error: "Network error. Please try again." });
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      onChunk({
        type: err["quotaExceeded"] ? "rate_limit_exceeded" : "error",
        error: (err["error"] as string) || "Request failed",
      });
      return;
    }

    // Parse SSE stream — format: data: {...}\n\n
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop()!;

      for (const part of parts) {
        const dataLine = part.replace(/^data: /gm, "").trim();
        if (!dataLine) continue;
        try {
          const chunk: SSEChunk = JSON.parse(dataLine);
          onChunk(chunk);
        } catch {
          // skip malformed chunks
        }
      }
    }
    // Server sends end_turn explicitly — no need to emit it again here
  }
}
