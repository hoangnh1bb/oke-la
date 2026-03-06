import { data } from "react-router";
import OpenAI from "openai";
import prisma from "../../db.server";
import { createSseStream } from "../../ai-assistant/services/stream-manager";
import { checkConciergeQuota } from "./concierge-streaming-response-service.server";
import { createExplainProductTool } from "./tools/smartrec-explain-product-tool.server";
import { createQuizTool } from "./tools/smartrec-quiz-tool.server";
import { createVisualSearchTool } from "./tools/smartrec-visual-search-tool.server";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { zodToJsonSchema } from "zod-to-json-schema";

interface ChatRequestBody {
  message?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  productId?: string;
  customerId?: string;
}

/** Convert a DynamicStructuredTool to OpenAI function-calling tool format */
function toOpenAITool(tool: DynamicStructuredTool): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      // Cast schema to ZodType — DynamicStructuredTool always uses Zod in our code
      parameters: zodToJsonSchema(tool.schema as any) as Record<string, unknown>,
    },
  };
}

/**
 * Handles POST /proxy/chat — streams SSE via OpenRouter with SmartRec tool-calling.
 * Uses OpenAI-compatible chat completions API directly (bypasses broken LangGraph pipeline).
 * Product context injected server-side into system prompt (hidden from user).
 * SSE format: data: {"type":"text","content":"..."}\n\n  |  data: {"type":"end_turn"}\n\n
 */
export async function handleChat(body: unknown, shopId: string, abortSignal: AbortSignal) {
  const { message, conversationHistory, productId } = body as ChatRequestBody;

  if (!message?.trim()) {
    return data({ error: "Message required" }, { status: 400 });
  }

  // Quota check
  const sub = await prisma.subscription.findUnique({ where: { shopId } }).catch(() => null);
  const plan = sub?.plan ?? "free";

  const quota = await checkConciergeQuota(shopId, plan);
  if (!quota.allowed) {
    return data({ quotaExceeded: true, plan, remaining: 0 }, { status: 402 });
  }

  // Load shop settings for branding and feature flags
  const settings = await prisma.shopSettings.findUnique({ where: { shop: shopId } }).catch(() => null);

  // Build SmartRec tools filtered by shop feature flags
  const allSmartrecTools = [
    createExplainProductTool(shopId, plan),
    createQuizTool(shopId),
    createVisualSearchTool(shopId, plan),
  ];
  const enabledTools = allSmartrecTools.filter((tool) => {
    if (tool.name === "smartrec_explain_product") return settings?.aiExplanationsEnabled !== false;
    if (tool.name === "smartrec_quiz") return settings?.aiQuizEnabled !== false;
    if (tool.name === "smartrec_visual_search") return settings?.aiVisualEnabled !== false;
    return true;
  });

  // Build hidden product context for system prompt
  let productContext = "";
  if (productId) {
    const product = await prisma.productCache
      .findFirst({ where: { shop: shopId, shopifyProductId: String(productId) } })
      .catch(() => null);
    if (product) {
      productContext = `\nThe customer is currently viewing: "${product.title}" (${product.productType || "uncategorized"}, $${product.price}). Product ID: ${product.shopifyProductId}.`;
    }
  }

  const agentName = settings?.agentName ?? "SmartRec Assistant";
  const systemPrompt =
    settings?.systemPromptOverride ||
    `You are ${agentName}, a helpful AI shopping assistant. Help customers find products, answer questions about the store, and provide personalized recommendations.

Rules:
- Be conversational, warm, and concise.
- When recommending products, use the available tools to search or explain products.
- If a customer asks to see similar products, use the visual search tool.
- If a customer wants guided recommendations, offer the quiz.
- Format product recommendations clearly.
- Never make up products that aren't in the catalog.${productContext}`;

  // Build messages array (history + current message)
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(conversationHistory ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const openRouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "https://example.com",
      "X-Title": "SmartRec",
    },
  });

  const openAITools = enabledTools.map(toOpenAITool);

  // Log usage asynchronously (non-blocking)
  setTimeout(() => {
    prisma.llmRequestLog
      .create({ data: { shopId, feature: "concierge", tokensUsed: 500, costUsd: 0.001 } })
      .catch(() => {});
  }, 0);

  // Create SSE stream — runs agentic tool-calling loop
  const stream = createSseStream(async (streamManager) => {
    // Agentic loop: stream response, handle tool calls, re-invoke until no more tool calls
    let loopMessages = [...messages];
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const completion = await openRouterClient.chat.completions.create({
        model: "anthropic/claude-haiku-4-5",
        max_tokens: 1024,
        stream: true,
        messages: loopMessages,
        tools: openAITools.length > 0 ? openAITools : undefined,
        tool_choice: openAITools.length > 0 ? "auto" : undefined,
      });

      // Collect streamed response
      let assistantText = "";
      const toolCallAccumulator: Record<string, { name: string; arguments: string }> = {};

      for await (const chunk of completion) {
        if (abortSignal.aborted) return;

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Stream text content to client
        if (delta.content) {
          assistantText += delta.content;
          streamManager.sendMessage({ type: "text", content: delta.content });
        }

        // Accumulate tool calls (streamed in fragments)
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallAccumulator[idx]) {
              toolCallAccumulator[idx] = { name: tc.function?.name ?? "", arguments: "" };
            }
            if (tc.function?.name) toolCallAccumulator[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallAccumulator[idx].arguments += tc.function.arguments;
          }
        }
      }

      const toolCallEntries = Object.entries(toolCallAccumulator);

      // No tool calls — done
      if (toolCallEntries.length === 0) {
        break;
      }

      // Execute tool calls and add results to messages for next iteration
      loopMessages.push({ role: "assistant", content: assistantText || null, tool_calls: toolCallEntries.map(([idx, tc]) => ({
        id: `call_${idx}`,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })) });

      for (const [idx, tc] of toolCallEntries) {
        const tool = enabledTools.find((t) => t.name === tc.name);
        let toolResult = "";
        if (tool) {
          try {
            const args = JSON.parse(tc.arguments || "{}");
            // Use func directly — invoke() return type varies by @langchain/core version
            toolResult = await (tool as any).func(args);
          } catch (err) {
            toolResult = JSON.stringify({ error: "Tool execution failed" });
          }
        } else {
          toolResult = JSON.stringify({ error: "Unknown tool" });
        }

        loopMessages.push({
          role: "tool",
          tool_call_id: `call_${idx}`,
          content: toolResult,
        });
      }
    }

    streamManager.sendMessage({ type: "end_turn" });
  }, abortSignal);

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
