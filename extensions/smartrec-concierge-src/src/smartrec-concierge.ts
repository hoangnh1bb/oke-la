import { STYLES } from "./styles";
import { ChatLauncher } from "./chat-launcher";
import { ChatService } from "./chat-service";
import { MessageManager } from "./message-manager";
import { MessageRenderer } from "./message-renderer";
import { ProactiveHandler } from "./proactive-handler";
import type { ConciergeMeta, SSEChunk } from "./types";

/** Default quick-reply suggestions shown after the welcome message */
const WELCOME_SUGGESTIONS = [
  "What makes this product special?",
  "Show me similar products",
  "What's the return policy?",
  "Help me choose the right one",
];

/** Quick replies shown on product pages after proactive chat opens */
const PRODUCT_SUGGESTIONS = [
  "Tell me more about this product",
  "Is it worth the price?",
  "Show me alternatives",
  "How do I use it?",
];

/**
 * Main web component — wires all sub-classes together.
 * Handles message send/receive loop, quick-reply chips, proactive auto-send.
 */
export class SmartRecConcierge extends HTMLElement {
  private meta!: ConciergeMeta;
  private launcher!: ChatLauncher;
  private chatService!: ChatService;
  private messageManager!: MessageManager;
  private renderer!: MessageRenderer;
  private proactiveHandler!: ProactiveHandler;
  private isLoading = false;

  connectedCallback(): void {
    const meta = window.SmartRecConciergeMeta;
    if (!meta) return; // fail silently if block not configured

    this.meta = meta;
    this.injectStyles();

    this.launcher = new ChatLauncher(this, this.meta, (isOpen) => {
      if (isOpen) this.proactiveHandler?.notifyChatOpened();
    });
    this.chatService = new ChatService(meta.appProxy);
    this.messageManager = new MessageManager();
    this.renderer = new MessageRenderer(this.launcher.messagesContainer, meta.primaryColor);

    // Wire quick-reply chip clicks to sendMessage
    this.renderer.onQuickReply = (text: string) => {
      this.launcher.input.value = text;
      this.dispatchSend();
    };

    this.proactiveHandler = new ProactiveHandler(this.launcher, this.meta);

    // Enter key sends message
    this.launcher.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.dispatchSend();
      }
    });

    // Welcome message + default suggestions
    this.renderer.appendAssistantMessage(
      `Hi! I'm **${meta.agentName}** — your personal shopping assistant. I can help you find the perfect product, answer questions, and give personalized recommendations. 🛍️`
    );
    this.renderer.appendQuickReplies(WELCOME_SUGGESTIONS);

    // Proactive nudge: on product pages, auto-send explanation when user clicks "Chat now"
    this.proactiveHandler.start(() => {
      // Auto-send a professional product explanation request
      if (this.meta.productId && this.meta.productTitle) {
        const autoQuery = `Please explain "${this.meta.productTitle}" to me — what makes it special, who it's for, and why I should consider buying it. Be helpful and visual.`;
        this.launcher.input.value = autoQuery;
        this.dispatchSend();
      } else {
        // Fallback: show product suggestions as chips
        this.renderer.appendQuickReplies(PRODUCT_SUGGESTIONS);
      }
    });
  }

  disconnectedCallback(): void {
    this.proactiveHandler?.stop();
  }

  private injectStyles(): void {
    if (document.getElementById("sr-concierge-styles")) return;
    const style = document.createElement("style");
    style.id = "sr-concierge-styles";
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  /** Trigger send from input value — shared by Enter key, send button, and quick-reply clicks */
  private dispatchSend(): void {
    const text = this.launcher.input.value.trim();
    if (!text || this.isLoading) return;
    this.launcher.input.value = "";
    void this.sendMessage(text);
  }

  private async sendMessage(text: string): Promise<void> {
    this.isLoading = true;
    this.launcher.setLoading(true);

    this.renderer.appendUserMessage(text);
    this.messageManager.add("user", text);
    this.renderer.showTypingIndicator();

    let replyText = "";
    let replyEl: HTMLElement | null = null;
    const productChunks: SSEChunk[] = [];

    await this.chatService.sendMessage(
      text,
      this.messageManager.getLastN(10),
      this.meta,
      (chunk: SSEChunk) => {
        if (chunk.type === "text" && chunk.content) {
          this.renderer.hideTypingIndicator();
          replyText += chunk.content;
          if (!replyEl) {
            replyEl = this.renderer.appendAssistantMessage(replyText);
          } else {
            this.renderer.updateAssistantMessage(replyEl, replyText);
          }
        } else if (chunk.type === "product") {
          this.renderer.appendProductCard(chunk);
          productChunks.push(chunk);
        } else if (chunk.type === "error" || chunk.type === "rate_limit_exceeded") {
          this.renderer.hideTypingIndicator();
          this.renderer.showError(
            chunk.type === "rate_limit_exceeded"
              ? "You've reached the monthly chat limit. Upgrade for unlimited access."
              : chunk.error || "Something went wrong. Please try again."
          );
        } else if (chunk.type === "end_turn") {
          this.renderer.hideTypingIndicator();
          if (replyText) this.messageManager.add("assistant", replyText);

          // Show contextual quick-reply suggestions after assistant response
          const suggestions = this.buildFollowUpSuggestions(text, productChunks.length > 0);
          if (suggestions.length) {
            this.renderer.appendQuickReplies(suggestions);
          }
        }
      }
    );

    this.isLoading = false;
    this.launcher.setLoading(false);
  }

  /**
   * Build contextual follow-up suggestions based on what the user just asked.
   * Keeps conversation flowing without requiring the user to type.
   */
  private buildFollowUpSuggestions(userText: string, hasProducts: boolean): string[] {
    const lower = userText.toLowerCase();

    if (lower.includes("explain") || lower.includes("special") || lower.includes("tell me")) {
      return ["Is it worth the price?", "Show me similar products", "What sizes are available?", "Add to cart"];
    }
    if (lower.includes("similar") || lower.includes("alternatives") || lower.includes("other")) {
      return ["Compare these products", "Which one is best for me?", "Show me reviews"];
    }
    if (lower.includes("price") || lower.includes("worth") || lower.includes("cost")) {
      return ["Do you offer discounts?", "What's included?", "Is there a warranty?"];
    }
    if (lower.includes("quiz") || lower.includes("help me choose") || lower.includes("right one")) {
      return ["Start the quiz", "Show me bestsellers", "What's most popular?"];
    }
    if (hasProducts) {
      return ["Tell me more about the first one", "Compare these", "Which is best value?"];
    }
    // Generic follow-ups
    return ["Tell me more", "Show me products", "What else can you help with?"];
  }
}
