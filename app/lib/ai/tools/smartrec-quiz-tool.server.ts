import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../../db.server";
import { rankByQuizAnswers } from "../../quiz-answers-product-ranker.server";

/** LangChain tool: runs guided quiz to get personalized product recommendations */
export function createQuizTool(shopId: string) {
  return new DynamicStructuredTool({
    name: "smartrec_quiz",
    description:
      "Run a guided product recommendation quiz. " +
      'Use mode="questions" to get the quiz questions for the customer. ' +
      'Use mode="answers" with customer answers to get ranked product recommendations. ' +
      "The quiz adapts to the store's catalog automatically.",
    schema: z.object({
      mode: z
        .enum(["questions", "answers"])
        .describe('"questions" to get quiz config, "answers" to submit answers and get recommendations'),
      answers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Customer answers as { questionId: selectedOption }. Required when mode="answers".'),
    }),
    func: async ({ mode, answers }: { mode: "questions" | "answers"; answers?: Record<string, string> }) => {
      try {
        if (mode === "questions") {
          const config = await prisma.quizConfig
            .findUnique({ where: { shopId } })
            .catch(() => null);
          return JSON.stringify(config ? JSON.parse(config.config) : { enabled: false });
        }

        // mode === "answers"
        const productIds = await rankByQuizAnswers(shopId, answers ?? {});
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

        return JSON.stringify({ productIds, products });
      } catch {
        return JSON.stringify({ error: "Quiz failed", products: [] });
      }
    },
  });
}
