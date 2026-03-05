/**
 * UC-04: The Cart Doubt Shopper
 * Trigger: cart page + idle >60s without checkout
 * Action: Trust nudge with complementary product suggestions (Storefront API COMPLEMENTARY intent)
 * Philosophy: Reassure about products IN cart + suggest "pairs well with" items
 */
import type { UseCaseHandler, SignalPayload, IntentAction, UseCaseSettings } from "../types";
import { fetchComplementaryProducts, type ShopifyProduct } from "../shopify-product-query.server";

export const uc04CartDoubtHandler: UseCaseHandler = {
  id: "uc04-cart-doubt-trust-nudge",

  isEnabled(settings: UseCaseSettings): boolean {
    return settings.ucCartEnabled;
  },

  async evaluate(payload: SignalPayload, settings: UseCaseSettings): Promise<IntentAction | null> {
    if (payload.pageType !== "cart") return null;
    if (payload.signals.cartHesitation < settings.ucCartHesitationSec) return null;

    // Fetch complementary products for first cart item
    const complementary: ShopifyProduct[] = [];
    const cartIds = payload.cartProductIds || [];

    if (cartIds.length > 0) {
      const results = await fetchComplementaryProducts(
        payload.shop,
        cartIds[0],
        settings.maxAlternatives,
      );
      // Exclude products already in cart
      const cartIdSet = new Set(cartIds);
      complementary.push(...results.filter((p) => !cartIdSet.has(p.id)));
    }

    return {
      type: "trust_nudge",
      data: {
        message: "Your items are highly rated by other shoppers",
        ...(complementary.length > 0 && {
          complementary: complementary.slice(0, settings.maxAlternatives).map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            image: p.image,
          })),
        }),
      },
    };
  },
};
