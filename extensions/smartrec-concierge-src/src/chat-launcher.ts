import type { ConciergeMeta } from "./types";

/** Builds and manages the FAB bubble + chat panel DOM elements with modern glassmorphism design */
export class ChatLauncher {
  private isOpen = false;
  bubble: HTMLButtonElement;
  panel: HTMLDivElement;
  input: HTMLInputElement;
  messagesContainer: HTMLDivElement;
  sendButton: HTMLButtonElement;

  constructor(
    private root: HTMLElement,
    private meta: ConciergeMeta,
    private onToggle?: (isOpen: boolean) => void
  ) {
    this.bubble = this.createBubble();
    const { panel, input, messagesContainer, sendButton } = this.createPanel();
    this.panel = panel;
    this.input = input;
    this.messagesContainer = messagesContainer;
    this.sendButton = sendButton;

    this.bubble.addEventListener("click", () => this.toggle());

    this.root.appendChild(this.bubble);
    this.root.appendChild(this.panel);
  }

  toggle(): void {
    if (this.isOpen) this.hide();
    else this.show();
  }

  show(): void {
    this.isOpen = true;
    this.panel.classList.add("open");
    setTimeout(() => this.input.focus(), 100);
    this.onToggle?.(true);
  }

  hide(): void {
    this.isOpen = false;
    this.panel.classList.remove("open");
    this.onToggle?.(false);
  }

  /** Enable/disable the send button and input to prevent double-submit */
  setLoading(loading: boolean): void {
    this.sendButton.disabled = loading;
    this.input.disabled = loading;
    this.input.style.opacity = loading ? "0.6" : "1";
  }

  /** Add/remove pulse ring on the FAB to attract attention on product pages */
  setPulse(active: boolean): void {
    if (active) {
      this.bubble.classList.add("sr-pulse");
      this.bubble.style.color = this.meta.primaryColor;
    } else {
      this.bubble.classList.remove("sr-pulse");
    }
  }

  private createBubble(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "sr-chat-bubble";
    btn.style.background = `linear-gradient(135deg, ${this.meta.primaryColor}, ${this.darken(this.meta.primaryColor, 20)})`;
    btn.setAttribute("aria-label", `Chat with ${this.meta.agentName}`);
    btn.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>`;
    return btn;
  }

  private createPanel(): { panel: HTMLDivElement; input: HTMLInputElement; messagesContainer: HTMLDivElement; sendButton: HTMLButtonElement } {
    const panel = document.createElement("div");
    panel.className = "sr-chat-panel";

    // Gradient header
    const header = document.createElement("div");
    header.className = "sr-chat-header";
    header.style.background = `linear-gradient(135deg, ${this.meta.primaryColor} 0%, ${this.darken(this.meta.primaryColor, 25)} 100%)`;

    // Avatar
    const avatar = document.createElement("div");
    avatar.className = "sr-chat-header-avatar";
    avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>`;
    header.appendChild(avatar);

    // Name + status
    const info = document.createElement("div");
    info.className = "sr-chat-header-info";

    const name = document.createElement("div");
    name.className = "sr-chat-header-name";
    name.textContent = this.meta.agentName;
    info.appendChild(name);

    const status = document.createElement("div");
    status.className = "sr-chat-header-status";
    const dot = document.createElement("span");
    dot.className = "sr-chat-header-dot";
    status.appendChild(dot);
    status.appendChild(document.createTextNode("Online · AI powered"));
    info.appendChild(status);

    header.appendChild(info);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "sr-chat-header-close";
    closeBtn.innerHTML = "&#x2715;";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.addEventListener("click", () => this.hide());
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Messages area
    const messages = document.createElement("div");
    messages.className = "sr-chat-messages";
    panel.appendChild(messages);

    // Input area
    const inputArea = document.createElement("div");
    inputArea.className = "sr-chat-input-area";

    const input = document.createElement("input");
    input.className = "sr-chat-input";
    input.type = "text";
    input.placeholder = "Ask me anything...";
    input.setAttribute("autocomplete", "off");
    inputArea.appendChild(input);

    const sendBtn = document.createElement("button");
    sendBtn.className = "sr-chat-send";
    sendBtn.style.background = `linear-gradient(135deg, ${this.meta.primaryColor}, ${this.darken(this.meta.primaryColor, 20)})`;
    sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
    sendBtn.addEventListener("click", () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    inputArea.appendChild(sendBtn);

    panel.appendChild(inputArea);

    return { panel, input, messagesContainer: messages, sendButton: sendBtn };
  }

  /** Darken a hex color by a given amount (0-255) */
  private darken(hex: string, amount: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp(parseInt(hex.slice(1, 3), 16) - amount);
    const g = clamp(parseInt(hex.slice(3, 5), 16) - amount);
    const b = clamp(parseInt(hex.slice(5, 7), 16) - amount);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
}
