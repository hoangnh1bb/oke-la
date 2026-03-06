import type { ChatMessage, ConciergeMeta, SSEChunk } from "./types";

/** Handles SSE streaming communication with the SmartRec proxy chat endpoint */
export class ChatService {
  constructor(private appProxy: string) {}

  async sendMessage(
    text: string,
    history: ChatMessage[],
    meta: ConciergeMeta,
    onChunk: (chunk: SSEChunk) => void
  ): Promise<void> {
    const body = {
      message: text,
      history,
      productId: meta.productId,
      productTitle: meta.productTitle,
      productType: meta.productType,
      customerId: meta.customerId,
      features: meta.features,
    };

    let response: Response;
    try {
      response = await fetch(`${this.appProxy}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      onChunk({ type: "error", error: "Network error. Please check your connection." });
      return;
    }

    if (!response.ok || !response.body) {
      onChunk({ type: "error", error: "Server error. Please try again." });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const chunk = JSON.parse(raw) as SSEChunk;
          onChunk(chunk);
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}
