export interface ConciergeMeta {
  appProxy: string;
  shop: string;
  customerId?: string;
  productId?: string;
  productTitle?: string;
  productType?: string;
  agentName: string;
  primaryColor: string;
  proactiveMessage?: string;
  features: {
    quiz: boolean;
    visualSearch: boolean;
    explainer: boolean;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SSEChunk {
  type: "text" | "product" | "end_turn" | "error" | "rate_limit_exceeded" | "done";
  content?: string;
  error?: string;
  // product fields
  id?: string;
  title?: string;
  handle?: string;
  image?: string;
  price?: string;
  reason?: string;
}

declare global {
  interface Window {
    SmartRecConciergeMeta?: ConciergeMeta;
  }
}
