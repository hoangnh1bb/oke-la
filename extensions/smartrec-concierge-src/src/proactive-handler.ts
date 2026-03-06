import type { ChatLauncher } from "./chat-launcher";
import type { ConciergeMeta } from "./types";

type State = "idle" | "waiting" | "showing" | "dismissed";

/** Shows a proactive nudge popover 2 seconds after landing on a product page, auto-sends product explanation */
export class ProactiveHandler {
  private state: State = "idle";
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private popover: HTMLDivElement | null = null;
  private onChatOpen: (() => void) | null = null;

  constructor(
    private launcher: ChatLauncher,
    private meta: ConciergeMeta
  ) {}

  /** Start the 2-second attention timer. onChatOpen is called when user clicks "Chat now". */
  start(onChatOpen?: () => void): void {
    this.onChatOpen = onChatOpen ?? null;

    if (!this.meta.productId) {
      this.state = "idle";
      return;
    }

    // Start FAB pulse animation immediately on product pages
    this.launcher.setPulse(true);

    this.state = "waiting";
    this.timerId = setTimeout(() => {
      if (this.state === "waiting") this.showPopover();
    }, 2000);
  }

  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.launcher.setPulse(false);
    this.removePopover();
    this.state = "idle";
  }

  notifyChatOpened(): void {
    if (this.state === "showing") this.dismiss();
    this.launcher.setPulse(false);
  }

  private showPopover(): void {
    this.state = "showing";

    const popover = document.createElement("div");
    popover.className = "sr-proactive-popover";

    // Header row: avatar + agent name + close button
    const header = document.createElement("div");
    header.className = "sr-proactive-header";

    const avatar = document.createElement("div");
    avatar.className = "sr-proactive-avatar";
    avatar.style.background = `linear-gradient(135deg, ${this.meta.primaryColor}22, ${this.meta.primaryColor}44)`;
    avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${this.meta.primaryColor}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>`;
    header.appendChild(avatar);

    const agentName = document.createElement("div");
    agentName.className = "sr-proactive-agent-name";
    agentName.textContent = this.meta.agentName;
    header.appendChild(agentName);

    const closeBtn = document.createElement("button");
    closeBtn.className = "sr-proactive-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Dismiss");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dismiss();
    });
    header.appendChild(closeBtn);
    popover.appendChild(header);

    // Message text
    const text = document.createElement("p");
    text.className = "sr-proactive-text";
    const productName = this.meta.productTitle ? `"${this.meta.productTitle}"` : "this product";
    text.textContent = this.meta.proactiveMessage ||
      `Interested in ${productName}? Let me explain why it could be perfect for you! ✨`;
    popover.appendChild(text);

    // CTA button — auto-sends explanation request on click
    const action = document.createElement("button");
    action.className = "sr-proactive-action";
    action.style.background = `linear-gradient(135deg, ${this.meta.primaryColor}, ${this.darken(this.meta.primaryColor, 20)})`;
    action.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Chat now`;
    action.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dismiss();
      this.launcher.show();
      this.onChatOpen?.();
    });
    popover.appendChild(action);

    document.body.appendChild(popover);
    this.popover = popover;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => popover.classList.add("visible"));
    });
  }

  private dismiss(): void {
    this.state = "dismissed";
    this.launcher.setPulse(false);
    this.removePopover();
  }

  private removePopover(): void {
    if (this.popover) {
      this.popover.classList.remove("visible");
      const el = this.popover;
      setTimeout(() => el.remove(), 300);
      this.popover = null;
    }
  }

  private darken(hex: string, amount: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp(parseInt(hex.slice(1, 3), 16) - amount);
    const g = clamp(parseInt(hex.slice(3, 5), 16) - amount);
    const b = clamp(parseInt(hex.slice(5, 7), 16) - amount);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
}
