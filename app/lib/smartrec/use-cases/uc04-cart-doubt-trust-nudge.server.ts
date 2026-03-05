/**
 * UC-04: The Cart Doubt Shopper
 * Trigger: cart page + idle >60s without checkout
 * Action: Trust nudge below cart items (ratings, return policy)
 * Philosophy: Reassure about products IN cart, never upsell or pressure
 */
import type { UseCaseHandler, SignalPayload, IntentAction, UseCaseSettings } from "../types";

export const uc04CartDoubtHandler: UseCaseHandler = {
  id: "uc04-cart-doubt-trust-nudge",

  isEnabled(settings: UseCaseSettings): boolean {
    return settings.ucCartEnabled;
  },

  async evaluate(payload: SignalPayload, settings: UseCaseSettings): Promise<IntentAction | null> {
    if (payload.pageType !== "cart") return null;
    if (payload.signals.cartHesitation < settings.ucCartHesitationSec) return null;

    return {
      type: "trust_nudge",
      data: {
        message: "Your items are highly rated by other shoppers",
      },
    };
  },
};
