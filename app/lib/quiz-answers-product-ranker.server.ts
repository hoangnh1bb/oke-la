// Ranks products from ProductCache based on quiz answers (category, budget, preferences)
// Uses progressive relaxation: relaxes filters when fewer than 4 results remain
import prisma from "../db.server";
import type { PriceBucket } from "./ai/quiz-config-generator-from-catalog.server";

export interface QuizAnswers {
  category?: string;
  budget?: string;
  preference?: string[];
}

export async function rankByQuizAnswers(
  shopId: string,
  answers: QuizAnswers
): Promise<string[]> {
  let products = await prisma.productCache.findMany({
    where: { shop: shopId, availableForSale: true },
  });

  // Filter by category
  if (answers.category) {
    products = products.filter((p) => p.productType === answers.category);
  }

  // Filter by budget using stored price buckets from quiz config
  if (answers.budget) {
    const config = await prisma.quizConfig
      .findUnique({ where: { shopId } })
      .catch(() => null);
    if (config) {
      const quizData = JSON.parse(config.config) as {
        priceBuckets: PriceBucket[];
      };
      const bucket = quizData.priceBuckets.find(
        (b) => b.label === answers.budget
      );
      if (bucket) {
        products = products.filter(
          (p) =>
            p.price >= bucket.min &&
            (bucket.max === null || p.price < bucket.max)
        );
      }
    }
  }

  // Score by tag preferences
  if (answers.preference?.length) {
    const scored = products.map((p) => {
      const productTags = p.tags.split(",").map((t) => t.trim());
      const score = answers.preference!.filter((pref) =>
        productTags.includes(pref)
      ).length;
      return { ...p, score };
    });

    const withScore = scored.filter((p) => p.score > 0);
    if (withScore.length >= 4) {
      return withScore
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((p) => p.shopifyProductId);
    }
    // Progressive relaxation: ignore preference filter if < 4 results
  }

  // Progressive relaxation: if still < 4, relax category constraint
  if (products.length < 4 && answers.category) {
    products = await prisma.productCache.findMany({
      where: { shop: shopId, availableForSale: true },
    });
  }

  return products.slice(0, 4).map((p) => p.shopifyProductId);
}
