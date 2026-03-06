import { STYLES } from "./styles";
import { ChatLauncher } from "./chat-launcher";
import { ChatService } from "./chat-service";
import { MessageManager } from "./message-manager";
import { MessageRenderer } from "./message-renderer";
import { ProactiveHandler } from "./proactive-handler";
import type { ConciergeMeta, SSEChunk } from "./types";

/** Main web component — wires all sub-classes together and handles message send/receive loop */
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
    if (!meta) return; // fail silently — block settings not configured

    this.meta = meta;
    this.injectStyles();

    this.launcher = new ChatLauncher(this, this.meta, (isOpen) => {
      if (isOpen) this.proactiveHandler?.notifyChatOpened();
    });
    this.chatService = new ChatService(meta.appProxy);
    this.messageManager = new MessageManager();
    this.renderer = new MessageRenderer(this.launcher.messagesContainer, meta.primaryColor);
    this.proactiveHandler = new ProactiveHandler(this.launcher, this.meta);

    // Handle Enter key to send
    this.launcher.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Welcome message
    this.renderer.appendAssistantMessage(
      `Hi! I'm **${meta.agentName}**. How can I help you find the perfect product today?`
    );

    // Start proactive nudge — inject product context if user opens via nudge
    this.proactiveHandler.start(() => {
      if (this.meta.productId && this.meta.productTitle) {
        const contextMsg = `I see you're looking at **${this.meta.productTitle}**. How can I help you with this product?`;
        this.renderer.appendAssistantMessage(contextMsg);
        this.messageManager.add("assistant", contextMsg);
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

  private async sendMessage(): Promise<void> {
    if (this.isLoading) return;
    const text = this.launcher.input.value.trim();
    if (!text) return;

    this.launcher.input.value = "";
    this.renderer.appendUserMessage(text);
    this.messageManager.add("user", text);

    this.isLoading = true;
    this.renderer.showTypingIndicator();

    let replyText = "";
    let replyEl: HTMLElement | null = null;

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
        }
      }
    );

    this.isLoading = false;
  }
}
