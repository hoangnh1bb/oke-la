// Explainer service: picks template or calls LLM to explain why product B > product A
// Caches results in ExplainerCache to avoid redundant LLM calls
import prisma from "../../db.server";
import { callLlm } from "./openrouter-llm-client.server";

export interface ProductData {
  id: string;
  title: string;
  price: number;
  rating: number;
  reviewCount: number;
  availableForSale: boolean;
}

// ── Template selection ──────────────────────────────────────────────────────

function selectTemplate(
  a: ProductData,
  b: ProductData,
  subRate = 0
): { key: string; confidence: number; text: string } {
  const priceDiff = a.price - b.price; // positive = B is cheaper

  if (priceDiff > 5)
    return {
      key: "cheaper",
      confidence: 0.9,
      text: `Save $${priceDiff.toFixed(0)} compared to what you're viewing`,
    };

  if ((b.rating || 0) - (a.rating || 0) > 0.2 && (b.reviewCount || 0) > 10)
    return {
      key: "betterRated",
      confidence: 0.85,
      text: `Rated ${b.rating}★ — ${((b.rating || 0) - (a.rating || 0)).toFixed(1)}★ higher with more reviews`,
    };

  if (b.availableForSale && !a.availableForSale)
    return {
      key: "inStock",
      confidence: 0.95,
      text: `All sizes available — ships today`,
    };

  if (subRate > 0.3)
    return {
      key: "popular",
      confidence: 0.8,
      text: `${Math.round(subRate * 100)}% of similar shoppers chose this instead`,
    };

  return {
    key: "substitution",
    confidence: 0.5,
    text: `Most chosen by shoppers who viewed ${a.title.slice(0, 30)}`,
  };
}

function buildExplainerPrompt(a: ProductData, b: ProductData): string {
  return `Generate a 1-sentence explanation (max 80 characters) of why product B is a better fit for a shopper currently viewing product A.
Use specific data. Be concise. Never make up data not provided.

Product A (currently viewing): ${a.title}, $${a.price.toFixed(2)}, rating: ${a.rating || "N/A"}
Product B (recommended): ${b.title}, $${b.price.toFixed(2)}, rating: ${b.rating || "N/A"}, ${b.reviewCount} reviews, ${b.availableForSale ? "in stock" : "limited stock"}

Output only the explanation sentence, nothing else. Max 80 characters.`;
}

function truncateTo80(text: string): string {
  if (text.length <= 80) return text;
  const truncated = text.slice(0, 77);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 50 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getExplanation(
  shopId: string,
  productAId: string,
  productBId: string,
  plan: string
): Promise<{ explanation: string; source: "template" | "llm" }> {
  // 1. Cache hit
  const cached = await prisma.explainerCache.findUnique({
    where: {
      shopId_productAId_productBId: { shopId, productAId, productBId },
    },
  });
  if (cached) {
    return {
      explanation: cached.explanation,
      source: cached.plan as "template" | "llm",
    };
  }

  // 2. Fetch both products from ProductCache
  const [productA, productB] = await Promise.all([
    prisma.productCache.findUnique({
      where: {
        shop_shopifyProductId: { shop: shopId, shopifyProductId: productAId },
      },
    }),
    prisma.productCache.findUnique({
      where: {
        shop_shopifyProductId: { shop: shopId, shopifyProductId: productBId },
      },
    }),
  ]);

  if (!productA || !productB) {
    return { explanation: "", source: "template" };
  }

  const a: ProductData = {
    id: productA.shopifyProductId,
    title: productA.title,
    price: productA.price,
    rating: productA.rating,
    reviewCount: productA.reviewCount,
    availableForSale: productA.availableForSale,
  };
  const b: ProductData = {
    id: productB.shopifyProductId,
    title: productB.title,
    price: productB.price,
    rating: productB.rating,
    reviewCount: productB.reviewCount,
    availableForSale: productB.availableForSale,
  };

  // 3. Pick template
  const { confidence, text } = selectTemplate(a, b);
  let explanation: string;
  let source: "template" | "llm" = "template";

  // 4. Use LLM for paid plans when template confidence is low
  if (confidence < 0.7 && plan !== "free" && process.env.OPENROUTER_API_KEY) {
    try {
      const llmText = await callLlm(
        buildExplainerPrompt(a, b),
        shopId,
        "explainer"
      );
      explanation = truncateTo80(llmText);
      source = "llm";
    } catch {
      explanation = truncateTo80(text);
    }
  } else {
    explanation = truncateTo80(text);
  }

  // 5. Persist to cache (non-blocking)
  prisma.explainerCache
    .upsert({
      where: {
        shopId_productAId_productBId: { shopId, productAId, productBId },
      },
      create: { shopId, productAId, productBId, explanation, plan: source },
      update: { explanation, plan: source },
    })
    .catch(() => {});

  return { explanation, source };
}
