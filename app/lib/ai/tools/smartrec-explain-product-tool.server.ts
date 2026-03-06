import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getExplanation } from "../product-recommendation-explainer-service.server";

/** LangChain tool: explains why a product might interest the customer using AI comparison */
export function createExplainProductTool(shopId: string, plan: string) {
  return new DynamicStructuredTool({
    name: "smartrec_explain_product",
    description:
      "Explain why a specific product might interest the customer by comparing it with another product. " +
      "Use this when a customer asks 'why should I buy this?' or wants to understand product differences. " +
      "Returns an AI-generated explanation text.",
    schema: z.object({
      productAId: z.string().describe("The Shopify product ID to explain"),
      productBId: z
        .string()
        .optional()
        .describe("Optional comparison product ID. If omitted, a relevant product is auto-selected."),
    }),
    func: async ({ productAId, productBId }) => {
      try {
        const result = await getExplanation(shopId, productAId, productBId ?? "", plan);
        return JSON.stringify(result);
      } catch {
        return JSON.stringify({ error: "Failed to generate explanation", explanation: "" });
      }
    },
  });
}
