import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import prisma from "../../../db.server";
import { queryNearestImage } from "../product-vector-upsert-and-query.server";

/** LangChain tool: finds visually similar products using AI image embedding vectors */
export function createVisualSearchTool(shopId: string, plan: string) {
  const k = plan === "free" ? 3 : plan === "starter" ? 5 : 8;

  return new DynamicStructuredTool({
    name: "smartrec_visual_search",
    description:
      "Find visually similar products to a given product using AI image matching. " +
      "Use this when a customer says 'show me products that look like this' or wants style-similar items. " +
      "Returns an array of similar products with images and prices.",
    schema: z.object({
      productId: z.string().describe("The Shopify product ID to find visual matches for"),
    }),
    func: async ({ productId }) => {
      try {
        const embedding = await prisma.productImageEmbedding.findUnique({
          where: { shopId_productId: { shopId, productId } },
        });
        if (!embedding) {
          return JSON.stringify({ results: [], message: "No image embedding found for this product" });
        }

        const vector = JSON.parse(embedding.vector) as number[];
        const nearest = await queryNearestImage(shopId, vector, k + 5);
        const filtered = nearest
          .filter((r) => r.similarity > 0.75 && r.productId !== productId)
          .slice(0, k);

        if (filtered.length === 0) {
          return JSON.stringify({ results: [], message: "No visually similar products found" });
        }

        const products = await prisma.productCache.findMany({
          where: {
            shop: shopId,
            shopifyProductId: { in: filtered.map((r) => r.productId) },
            availableForSale: true,
          },
        });

        return JSON.stringify({ results: products });
      } catch {
        return JSON.stringify({ results: [], error: "Visual search failed" });
      }
    },
  });
}
