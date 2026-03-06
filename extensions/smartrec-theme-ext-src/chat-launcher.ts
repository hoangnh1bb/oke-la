import type { ConciergeMeta } from "./types";

/** Builds and manages the FAB bubble + chat panel DOM elements */
export class ChatLauncher {
  private isOpen = false;
  bubble: HTMLButtonElement;
  panel: HTMLDivElement;
  input: HTMLInputElement;
  messagesContainer: HTMLDivElement;

  constructor(
    private root: HTMLElement,
    private meta: ConciergeMeta,
    private onToggle?: (isOpen: boolean) => void
  ) {
    this.bubble = this.createBubble();
    const { panel, input, messagesContainer } = this.createPanel();
    this.panel = panel;
    this.input = input;
    this.messagesContainer = messagesContainer;

    this.bubble.addEventListener("click", () => this.toggle());

    this.root.appendChild(this.bubble);
    this.root.appendChild(this.panel);
  }

  toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    this.isOpen = true;
    this.panel.classList.add("open");
    this.input.focus();
    this.onToggle?.(true);
  }

  hide(): void {
    this.isOpen = false;
    this.panel.classList.remove("open");
    this.onToggle?.(false);
  }

  private createBubble(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "sr-chat-bubble";
    btn.style.background = this.meta.primaryColor;
    btn.setAttribute("aria-label", `Open ${this.meta.agentName} chat`);
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#fff"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    return btn;
  }

  private createPanel(): { panel: HTMLDivElement; input: HTMLInputElement; messagesContainer: HTMLDivElement } {
    const panel = document.createElement("div");
    panel.className = "sr-chat-panel";

    // Header
    const header = document.createElement("div");
    header.className = "sr-chat-header";
    header.style.background = this.meta.primaryColor;

    const headerIcon = document.createElement("span");
    headerIcon.textContent = "✦";
    header.appendChild(headerIcon);

    const headerTitle = document.createElement("span");
    headerTitle.textContent = this.meta.agentName;
    header.appendChild(headerTitle);

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
    sendBtn.style.background = this.meta.primaryColor;
    sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
    sendBtn.addEventListener("click", () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    inputArea.appendChild(sendBtn);

    panel.appendChild(inputArea);

    return { panel, input, messagesContainer: messages };
  }
}
