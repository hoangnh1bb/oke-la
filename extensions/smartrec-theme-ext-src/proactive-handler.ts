import type { ChatLauncher } from "./chat-launcher";
import type { ConciergeMeta } from "./types";

type State = "idle" | "waiting" | "showing" | "dismissed";

/** Shows a proactive nudge popover 5 seconds after landing on a product page */
export class ProactiveHandler {
  private state: State = "idle";
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private popover: HTMLDivElement | null = null;
  private onChatOpen: (() => void) | null = null;

  constructor(
    private launcher: ChatLauncher,
    private meta: ConciergeMeta
  ) {}

  /** Start the 5-second timer. Pass onChatOpen callback to inject product context when nudge is clicked. */
  start(onChatOpen?: () => void): void {
    this.onChatOpen = onChatOpen ?? null;

    // Only activate on product pages
    if (!this.meta.productId) {
      this.state = "idle";
      return;
    }

    this.state = "waiting";
    this.timerId = setTimeout(() => {
      if (this.state === "waiting") {
        this.showPopover();
      }
    }, 5000);
  }

  /** Clean up timer and DOM — call from disconnectedCallback */
  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.removePopover();
    this.state = "idle";
  }

  /** Notify handler when chat panel opens via FAB — cancels pending timer or dismisses popover */
  notifyChatOpened(): void {
    if (this.state === "waiting") {
      // Cancel timer before popover appears
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.state = "dismissed";
    } else if (this.state === "showing") {
      this.dismiss();
    }
  }

  private showPopover(): void {
    this.state = "showing";

    const popover = document.createElement("div");
    popover.className = "sr-proactive-popover";

    const closeBtn = document.createElement("button");
    closeBtn.className = "sr-proactive-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Dismiss");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dismiss();
    });

    const text = document.createElement("p");
    text.className = "sr-proactive-text";
    text.textContent = this.meta.proactiveMessage || "Hi! Want to know more about this product?";

    const action = document.createElement("button");
    action.className = "sr-proactive-action";
    action.style.background = this.meta.primaryColor;
    action.textContent = "Chat now";
    action.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dismiss();
      this.launcher.show();
      this.onChatOpen?.();
    });

    popover.appendChild(closeBtn);
    popover.appendChild(text);
    popover.appendChild(action);
    document.body.appendChild(popover);
    this.popover = popover;

    // Trigger fade-in on next frame
    requestAnimationFrame(() => {
      popover.classList.add("visible");
    });
  }

  private dismiss(): void {
    this.state = "dismissed";
    this.removePopover();
  }

  private removePopover(): void {
    if (this.popover) {
      this.popover.classList.remove("visible");
      const el = this.popover;
      setTimeout(() => el.remove(), 200);
      this.popover = null;
    }
  }
}
