/**
 * UC-02: The Comparison Shopper
 * Trigger: comparePattern detected + ≥2 products same type in session
 * Action: Sticky comparison bar at bottom with product A vs B stats
 * Philosophy: Help decide between 2 they're already considering, don't add a 3rd
 */
import type { UseCaseHandler, SignalPayload, IntentAction, UseCaseSettings } from "../types";

export const uc02ComparisonShopperHandler: UseCaseHandler = {
  id: "uc02-comparison-shopper",

  isEnabled(settings: UseCaseSettings): boolean {
    return settings.ucCompareEnabled;
  },

  async evaluate(payload: SignalPayload, _settings: UseCaseSettings): Promise<IntentAction | null> {
    if (payload.pageType !== "product") return null;
    if (!payload.signals.comparePattern) return null;
    if (!payload.viewedProducts || payload.viewedProducts.length < 2) return null;
    if (!payload.currentProduct) return null;

    // Find previous product of same type (the one they're comparing against)
    const previousSameType = [...payload.viewedProducts]
      .reverse()
      .find((p) => p.type === payload.currentProduct!.type && p.id !== payload.currentProduct!.id);

    if (!previousSameType) return null;

    return {
      type: "comparison_bar",
      data: {
        productA: {
          id: previousSameType.id,
          title: previousSameType.title,
          price: previousSameType.price,
          image: previousSameType.image,
          url: previousSameType.url || "",
        },
        productB: {
          id: payload.currentProduct.id,
          title: payload.currentProduct.title,
          price: payload.currentProduct.price,
          image: payload.currentProduct.image,
          url: payload.currentProduct.url || "",
        },
      },
    };
  },
};
