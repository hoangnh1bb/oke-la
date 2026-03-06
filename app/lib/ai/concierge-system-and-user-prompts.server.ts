// Prompt builders for the AI shopping concierge — system prompt sets persona,
// user prompt injects catalog context and instructs JSON-lines response format
export interface ProductSummary {
  shopifyProductId: string;
  title: string;
  price: number;
  tags: string;
  handle: string;
  imageUrl: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export function buildSystemPrompt(
  storeName: string,
  productTypes: string[]
): string {
  return `You are a helpful shopping assistant for ${storeName}.
Your job: help shoppers find products from this store's catalog only.

Rules:
- ONLY recommend products from the "Available products" list in the user message. Never invent products.
- Recommend 2-3 products maximum per response.
- For each product, provide a 1-sentence reason (max 60 chars) as JSON field "reason".
- Be conversational and warm. Be concise.
- If no products match well, say so honestly.
- Respond with JSON lines format as instructed.

Store sells: ${productTypes.filter(Boolean).join(", ") || "various products"}.`;
}

export function buildUserPrompt(
  message: string,
  topProducts: ProductSummary[],
  history: ConversationMessage[]
): string {
  const productsJson = JSON.stringify(
    topProducts.map((p) => ({
      id: p.shopifyProductId,
      title: p.title,
      price: `$${p.price.toFixed(2)}`,
      tags: p.tags,
      handle: p.handle,
      image: p.imageUrl,
    }))
  );

  const historyText = history
    .slice(-3)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  return `Available products matching query:
${productsJson}

${historyText ? `Previous context:\n${historyText}\n\n` : ""}Shopper: ${message}

Respond with JSON lines (one JSON object per line, no backticks):
{"type":"text","content":"..."} for any prose text
{"type":"product","id":"...","title":"...","price":"...","image":"...","handle":"...","reason":"..."} for each product recommendation
{"type":"done"} as the last line`;
}
