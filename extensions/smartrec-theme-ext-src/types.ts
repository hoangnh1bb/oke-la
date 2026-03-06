/** Configuration object injected by the Liquid embed block via window.SmartRecConciergeMeta */
export interface ConciergeMeta {
  appProxy: string;
  shop: string;
  productId?: string;
  productTitle?: string;
  productType?: string;
  customerId?: string;
  primaryColor: string;
  agentName: string;
  proactiveMessage: string;
  features: {
    quiz: boolean;
    visual: boolean;
    explainer: boolean;
  };
}

/** A single message in the chat conversation history */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** A chunk received from the SSE stream at /apps/smartrec/chat */
export interface SSEChunk {
  type: "text" | "product" | "error" | "rate_limit_exceeded" | "end_turn";
  content?: string;
  // Product card fields (when type === "product")
  title?: string;
  handle?: string;
  image?: string;
  price?: string;
  reason?: string;
  // Error fields
  error?: string;
  details?: string;
}

declare global {
  interface Window {
    SmartRecConciergeMeta?: ConciergeMeta;
  }
}
