// AI shopping concierge: quota enforcement, vector search, and streaming LLM response
// Returns a ReadableStream of JSON-lines for real-time chat UI rendering
import prisma from "../../db.server";
import { embedText } from "./text-and-image-embeddings.server";
import { queryNearestText } from "./product-vector-upsert-and-query.server";
import { streamLlm } from "./openrouter-llm-client.server";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "./concierge-system-and-user-prompts.server";
import type { ConversationMessage } from "./concierge-system-and-user-prompts.server";

const MONTHLY_QUOTA: Record<string, number> = {
  free: 20,
  starter: 200,
  growth: 1000,
  scale: Infinity,
};

export async function checkConciergeQuota(
  shopId: string,
  plan: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = MONTHLY_QUOTA[plan] ?? 20;
  if (limit === Infinity) return { allowed: true, remaining: Infinity, limit };

  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const used = await prisma.llmRequestLog.count({
    where: { shopId, feature: "concierge", createdAt: { gte: start } },
  });

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

export async function streamConciergeResponse(
  shopId: string,
  message: string,
  history: ConversationMessage[]
): Promise<ReadableStream<string>> {
  // 1. Embed shopper message for vector search
  let queryVector: number[];
  try {
    queryVector = await embedText(message);
  } catch {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(
          JSON.stringify({
            type: "text",
            content:
              "I had trouble searching the catalog. Please try again.",
          })
        );
        controller.enqueue("\n");
        controller.enqueue(JSON.stringify({ type: "done" }));
        controller.enqueue("\n");
        controller.close();
      },
    });
  }

  // 2. Vector search for top-8 relevant products
  const nearest = await queryNearestText(shopId, queryVector, 8);
  const productIds = nearest.map((r) => r.productId);

  const products =
    productIds.length > 0
      ? await prisma.productCache.findMany({
          where: { shop: shopId, shopifyProductId: { in: productIds } },
        })
      : [];

  // 3. Build prompts with catalog context
  const productTypes = [
    ...new Set(products.map((p) => p.productType).filter(Boolean)),
  ];
  const systemPrompt = buildSystemPrompt("our store", productTypes);
  const userPrompt = buildUserPrompt(message, products as any, history);

  // 4. Log usage estimate asynchronously
  setTimeout(() => {
    prisma.llmRequestLog
      .create({
        data: {
          shopId,
          feature: "concierge",
          tokensUsed: 500,
          costUsd: 0.001,
        },
      })
      .catch(() => {});
  }, 0);

  // 5. Return streaming LLM response
  return streamLlm(systemPrompt, userPrompt);
}
