import { marked } from "marked";
import type { SSEChunk } from "./types";

/** Handles all DOM rendering: messages, product cards, typing indicator, quick-reply chips, image grids */
export class MessageRenderer {
  private container: HTMLElement;
  private primaryColor: string;
  /** Callback invoked when user clicks a quick-reply chip */
  onQuickReply?: (text: string) => void;

  constructor(container: HTMLElement, primaryColor: string) {
    this.container = container;
    this.primaryColor = primaryColor;
  }

  appendUserMessage(text: string): void {
    const row = document.createElement("div");
    row.className = "sr-msg-row user";

    const el = document.createElement("div");
    el.className = "sr-chat-msg-user";
    el.style.background = this.primaryColor;
    el.textContent = text;

    const time = document.createElement("div");
    time.className = "sr-msg-time";
    time.textContent = this.formatTime();

    row.appendChild(el);
    row.appendChild(time);
    this.container.appendChild(row);
    this.scrollToBottom();
  }

  appendAssistantMessage(text: string): HTMLElement {
    const row = document.createElement("div");
    row.className = "sr-msg-row assistant";

    const el = document.createElement("div");
    el.className = "sr-chat-msg-assistant";
    el.innerHTML = marked.parse(text) as string;

    row.appendChild(el);
    this.container.appendChild(row);
    this.scrollToBottom();
    return el;
  }

  updateAssistantMessage(el: HTMLElement, text: string): void {
    el.innerHTML = marked.parse(text) as string;
    this.scrollToBottom();
  }

  /** Renders a group of product SSEChunks as stacked cards */
  appendProductCard(product: SSEChunk): void {
    const shopDomain = (window.SmartRecConciergeMeta?.shop ?? "").replace(/\/$/, "");
    const href = product.handle ? `https://${shopDomain}/products/${product.handle}` : "#";

    // Reuse or create a products-row container for grouping consecutive product cards
    let row = this.container.querySelector(".sr-products-row:last-child") as HTMLElement | null;
    if (!row || row.nextSibling !== null) {
      row = document.createElement("div");
      row.className = "sr-products-row";
      this.container.appendChild(row);
    }

    const link = document.createElement("a");
    link.className = "sr-chat-product";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    if (product.image) {
      const img = document.createElement("img");
      img.src = product.image;
      img.alt = product.title ?? "";
      img.loading = "lazy";
      link.appendChild(img);
    }

    const info = document.createElement("div");
    info.className = "sr-chat-product-info";

    const title = document.createElement("div");
    title.className = "sr-chat-product-title";
    title.textContent = product.title ?? "";
    info.appendChild(title);

    if (product.price) {
      const price = document.createElement("div");
      price.className = "sr-chat-product-price";
      price.textContent = `$${product.price}`;
      info.appendChild(price);
    }

    if (product.reason) {
      const reason = document.createElement("div");
      reason.className = "sr-chat-product-reason";
      reason.textContent = product.reason;
      info.appendChild(reason);
    }

    const arrow = document.createElement("span");
    arrow.className = "sr-chat-product-arrow";
    arrow.textContent = "›";

    link.appendChild(info);
    link.appendChild(arrow);
    row.appendChild(link);
    this.scrollToBottom();
  }

  /**
   * Renders clickable quick-reply suggestion chips below the last assistant message.
   * Clicking a chip fires onQuickReply(text).
   */
  appendQuickReplies(suggestions: string[]): void {
    if (!suggestions.length) return;

    const row = document.createElement("div");
    row.className = "sr-quick-replies";

    for (const text of suggestions) {
      const chip = document.createElement("button");
      chip.className = "sr-quick-reply";
      chip.style.borderColor = this.hexWithAlpha(this.primaryColor, 0.35);
      chip.style.color = this.primaryColor;
      chip.textContent = text;
      chip.addEventListener("click", () => {
        // Remove chips after selection
        row.remove();
        this.onQuickReply?.(text);
      });
      row.appendChild(chip);
    }

    this.container.appendChild(row);
    this.scrollToBottom();
  }

  /** Renders a 2-column image grid for visual suggestions */
  appendImageGrid(images: Array<{ src: string; caption: string }>): void {
    if (!images.length) return;
    const grid = document.createElement("div");
    grid.className = "sr-image-grid";

    for (const { src, caption } of images) {
      const card = document.createElement("div");
      card.className = "sr-image-card";

      const img = document.createElement("img");
      img.src = src;
      img.alt = caption;
      img.loading = "lazy";
      card.appendChild(img);

      const cap = document.createElement("div");
      cap.className = "sr-image-card-caption";
      cap.textContent = caption;
      card.appendChild(cap);

      grid.appendChild(card);
    }

    this.container.appendChild(grid);
    this.scrollToBottom();
  }

  showTypingIndicator(): void {
    const row = document.createElement("div");
    row.className = "sr-msg-row assistant";
    row.id = "sr-typing-row";

    const el = document.createElement("div");
    el.className = "sr-chat-typing";
    el.id = "sr-typing-indicator";

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.style.background = this.primaryColor;
      el.appendChild(dot);
    }

    row.appendChild(el);
    this.container.appendChild(row);
    this.scrollToBottom();
  }

  hideTypingIndicator(): void {
    document.getElementById("sr-typing-row")?.remove();
    document.getElementById("sr-typing-indicator")?.remove();
  }

  showError(message: string): void {
    this.appendAssistantMessage(`⚠️ ${message}`);
  }

  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  private formatTime(): string {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  private hexWithAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
