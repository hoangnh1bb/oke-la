// LLM wrapper using OpenRouter API (OpenAI-compatible interface)
// Supports both single-shot callLlm() and streaming streamLlm()
import OpenAI from "openai";
import prisma from "../../db.server";

const openRouterClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_URL || "https://example.com",
    "X-Title": "SmartRec",
  },
});

// In-memory response cache (TTL: 1 hour)
const responseCache = new Map<string, { value: string; expiresAt: number }>();

function hashPrompt(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export async function callLlm(
  prompt: string,
  shopId?: string,
  feature = "explainer",
  maxTokens = 256
): Promise<string> {
  const key = hashPrompt(prompt);
  const cached = responseCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const msg = await openRouterClient.chat.completions.create({
        model: "anthropic/claude-haiku-4-5",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });
      const text = msg.choices[0]?.message?.content || "";
      responseCache.set(key, {
        value: text,
        expiresAt: Date.now() + 3_600_000,
      });

      if (shopId) {
        const tokensUsed = msg.usage?.total_tokens ?? 0;
        const costUsd = tokensUsed * 0.00000025;
        prisma.llmRequestLog
          .create({ data: { shopId, feature, tokensUsed, costUsd } })
          .catch(() => {});
      }
      return text;
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2)
        await new Promise((r) =>
          setTimeout(r, 1000 * Math.pow(2, attempt))
        );
    }
  }
  throw lastError;
}

export async function streamLlm(
  systemPrompt: string,
  userPrompt: string
): Promise<ReadableStream<string>> {
  const stream = await openRouterClient.chat.completions.create({
    model: "anthropic/claude-haiku-4-5",
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) controller.enqueue(text);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      stream.controller.abort();
    },
  });
}
