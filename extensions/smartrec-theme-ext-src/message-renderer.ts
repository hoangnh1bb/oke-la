import { marked } from "marked";
import type { SSEChunk } from "./types";

/** Handles all DOM rendering: user/assistant messages, product cards, typing indicator */
export class MessageRenderer {
  private container: HTMLElement;
  private primaryColor: string;

  constructor(container: HTMLElement, primaryColor: string) {
    this.container = container;
    this.primaryColor = primaryColor;
  }

  appendUserMessage(text: string): void {
    const el = document.createElement("div");
    el.className = "sr-chat-msg-user";
    el.style.background = this.primaryColor;
    el.textContent = text;
    this.container.appendChild(el);
    this.scrollToBottom();
  }

  appendAssistantMessage(text: string): HTMLElement {
    const el = document.createElement("div");
    el.className = "sr-chat-msg-assistant";
    el.innerHTML = marked.parse(text) as string;
    this.container.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  updateAssistantMessage(el: HTMLElement, text: string): void {
    el.innerHTML = marked.parse(text) as string;
    this.scrollToBottom();
  }

  appendProductCard(product: SSEChunk): void {
    const shopDomain = (window.SmartRecConciergeMeta?.shop ?? "").replace(/\/$/, "");
    const href = product.handle ? `https://${shopDomain}/products/${product.handle}` : "#";

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

    link.appendChild(info);
    this.container.appendChild(link);
    this.scrollToBottom();
  }

  showTypingIndicator(): void {
    const el = document.createElement("div");
    el.className = "sr-chat-typing";
    el.id = "sr-typing-indicator";
    el.innerHTML = "<span></span><span></span><span></span>";
    this.container.appendChild(el);
    this.scrollToBottom();
  }

  hideTypingIndicator(): void {
    document.getElementById("sr-typing-indicator")?.remove();
  }

  showError(message: string): void {
    this.appendAssistantMessage(message);
  }

  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }
}
