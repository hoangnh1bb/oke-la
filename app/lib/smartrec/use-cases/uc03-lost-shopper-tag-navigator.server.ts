/**
 * UC-03: The Lost Shopper
 * Trigger: back_nav ≥3 + empty cart + viewed ≥3 products
 * Action: Slide-in panel with top 3 tags from viewed products as filter shortcuts
 * Philosophy: Help them narrow down, don't recommend specific products
 */
import type { UseCaseHandler, SignalPayload, IntentAction, UseCaseSettings } from "../types";
import { extractCommonTags } from "../tag-extractor.server";

export const uc03LostShopperHandler: UseCaseHandler = {
  id: "uc03-lost-shopper-tag-navigator",

  isEnabled(settings: UseCaseSettings): boolean {
    return settings.ucLostEnabled;
  },

  async evaluate(payload: SignalPayload, settings: UseCaseSettings): Promise<IntentAction | null> {
    if (payload.backNavCount < settings.ucLostBackNavMin) return null;
    if (!payload.viewedProducts || payload.viewedProducts.length < 3) return null;

    const tags = extractCommonTags(payload.viewedProducts, 3);
    if (tags.length === 0) return null;

    return {
      type: "tag_navigator",
      data: { tags },
    };
  },
};
