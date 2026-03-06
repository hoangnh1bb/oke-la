/**
 * UC-01: The Hesitating Shopper
 * Trigger: score 56-89 + (sizeChartOpen OR reviewHover) on product page
 * Action: Show 2 alternative products inline below description
 * Philosophy: Help uncertain shoppers find better fit, not upsell
 */
import type { UseCaseHandler, SignalPayload, IntentAction, UseCaseSettings } from "../types";
import { findAlternativeProducts } from "../alternatives-finder.server";

export const uc01HesitatingShopperHandler: UseCaseHandler = {
  id: "uc01-hesitating-shopper",

  isEnabled(settings: UseCaseSettings): boolean {
    return settings.ucHesitationEnabled;
  },

  async evaluate(payload: SignalPayload, settings: UseCaseSettings): Promise<IntentAction | null> {
    if (payload.pageType !== "product") return null;
    if (payload.score < settings.thresholdConsidering || payload.score > settings.thresholdStrongIntent) return null;
    if (!payload.currentProduct) return null;
    // sizeChartOpen/reviewHover boost score but are not required —
    // many stores lack detectable review/size chart elements

    const alts = await findAlternativeProducts(
      payload.shop,
      payload.currentProduct,
      payload.viewedProducts,
      settings.maxAlternatives,
    );

    if (alts.length === 0) return null;

    return {
      type: "alternative_nudge",
      data: { products: alts },
    };
  },
};
