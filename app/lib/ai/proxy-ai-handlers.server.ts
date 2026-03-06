// SmartRec AI proxy route handlers for explain, quiz, visual-search, and concierge endpoints
// Authentication is performed in proxy.$.tsx; handlers receive (body, shopId)
import { data } from "react-router";
import prisma from "../../db.server";
import { getExplanation } from "./product-recommendation-explainer-service.server";
import { refreshQuizConfig } from "../quiz-config-refresh-job.server";
import { rankByQuizAnswers } from "../quiz-answers-product-ranker.server";
import { queryNearestImage } from "./product-vector-upsert-and-query.server";
import {
  checkConciergeQuota,
  streamConciergeResponse,
} from "./concierge-streaming-response-service.server";
import type { QuizAnswers } from "../quiz-answers-product-ranker.server";

// Shopify's admin.graphql() returns a Response (not { data })
type AdminGraphql = (
  query: string,
  opts?: unknown
) => Promise<Response>;

// ── Explain ─────────────────────────────────────────────────────────────────

export async function handleExplain(body: unknown, shopId: string) {
  try {
    const { productAId, productBId } = body as {
      productAId?: string;
      productBId?: string;
    };

    // productAId required; productBId optional — if missing, pick any other cached product
    if (!productAId) {
      return data({ explanation: "", source: "template" });
    }

    let resolvedBId = productBId ? String(productBId) : null;

    // If no comparison product provided, find one from the same shop's product cache
    if (!resolvedBId) {
      const fallback = await prisma.productCache.findFirst({
        where: {
          shop: shopId,
          shopifyProductId: { not: String(productAId) },
          availableForSale: true,
        },
      });
      resolvedBId = fallback?.shopifyProductId ?? null;
    }

    if (!resolvedBId) {
      // No products indexed yet — tell the widget to hide itself
      return data({ explanation: "", source: "template", notIndexed: true });
    }

    const sub = await prisma.subscription
      .findUnique({ where: { shopId } })
      .catch(() => null);
    const plan = sub?.plan ?? "free";

    const result = await getExplanation(
      shopId,
      String(productAId),
      resolvedBId,
      plan
    );

    return data(result);
  } catch (err) {
    console.error("[SmartRec] handleExplain error:", err);
    return data({ explanation: "", source: "template", notIndexed: true });
  }
}

// ── Quiz ────────────────────────────────────────────────────────────────────

export async function handleQuiz(
  request: Request,
  shopId: string,
  adminGraphql?: AdminGraphql
) {
  try {
    if (request.method === "GET") {
      const config = await prisma.quizConfig
        .findUnique({ where: { shopId } })
        .catch(() => null);

      // Regenerate if missing or stale (> 24 h)
      if (
        (!config ||
          Date.now() - config.updatedAt.getTime() > 86_400_000) &&
        adminGraphql
      ) {
        try {
          const generated = await refreshQuizConfig(shopId, adminGraphql);
          return data(generated);
        } catch (err) {
          console.error("[SmartRec] Quiz refresh failed:", err);
        }
      }

      return data(config ? JSON.parse(config.config) : { enabled: false });
    }

    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return data({ error: "Invalid JSON" }, { status: 400 });
      }
      const { answers } = body as { answers?: QuizAnswers };
      const productIds = await rankByQuizAnswers(shopId, answers ?? {});

      // Fetch full product objects so the widget can render cards
      const products = productIds.length
        ? await prisma.productCache.findMany({
            where: {
              shop: shopId,
              shopifyProductId: { in: productIds },
              availableForSale: true,
            },
            take: 6,
          })
        : [];

      return data({ productIds, products });
    }

    return data({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("[SmartRec] handleQuiz error:", err);
    return data({ enabled: false });
  }
}

// ── Visual search ────────────────────────────────────────────────────────────

export async function handleVisual(body: unknown, shopId: string) {
  try {
    const sub = await prisma.subscription
      .findUnique({ where: { shopId } })
      .catch(() => null);
    const plan = sub?.plan ?? "free";
    // Free plan gets 3 results; paid plans get more
    const k = plan === "free" ? 3 : plan === "starter" ? 5 : 8;

    const { productId } = body as { productId?: string };
    if (!productId) return data({ results: [] });

    const embedding = await prisma.productImageEmbedding.findUnique({
      where: {
        shopId_productId: { shopId, productId: String(productId) },
      },
    });
    if (!embedding) return data({ results: [] });

    const vector = JSON.parse(embedding.vector) as number[];
    const nearest = await queryNearestImage(shopId, vector, k + 5);
    const filtered = nearest
      .filter(
        (r) => r.similarity > 0.75 && r.productId !== String(productId)
      )
      .slice(0, k);

    if (filtered.length === 0) return data({ results: [] });

    const products = await prisma.productCache.findMany({
      where: {
        shop: shopId,
        shopifyProductId: { in: filtered.map((r) => r.productId) },
        availableForSale: true,
      },
    });

    return data({ results: products });
  } catch (err) {
    console.error("[SmartRec] handleVisual error:", err);
    return data({ results: [] });
  }
}

// ── Concierge ────────────────────────────────────────────────────────────────

export async function handleConcierge(body: unknown, shopId: string) {
  try {
    const sub = await prisma.subscription
      .findUnique({ where: { shopId } })
      .catch(() => null);
    const plan = sub?.plan ?? "free";

    const quota = await checkConciergeQuota(shopId, plan);
    if (!quota.allowed) {
      return data({ quotaExceeded: true, plan, remaining: 0 }, { status: 402 });
    }

    const { message, conversationHistory } = body as {
      message?: string;
      conversationHistory?: Array<{
        role: "user" | "assistant";
        content: string;
      }>;
    };

    if (!message?.trim()) {
      return data({ error: "Message required" }, { status: 400 });
    }

    const stream = await streamConciergeResponse(
      shopId,
      message,
      conversationHistory ?? []
    );

    return new Response(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[SmartRec] handleConcierge error:", err);
    return data({ error: "Internal error" }, { status: 500 });
  }
}
