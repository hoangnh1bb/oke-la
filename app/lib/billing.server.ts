import type { BillingInterval } from "@shopify/shopify-app-react-router/server";

export interface CreateChargeParams {
  shop: string;
  plan: "growth" | "appearance_pro" | "analytics_pro";
  returnUrl: string;
  billing: any; // Shopify billing object from authenticate.admin
}

export interface ChargeResult {
  confirmationUrl?: string;
  success: boolean;
  error?: string;
}

export const PRICING_TIERS = {
  growth: {
    amount: 11.0,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS" as BillingInterval,
    trialDays: 7,
  },
  appearance_pro: {
    amount: 5.0,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS" as BillingInterval,
  },
  analytics_pro: {
    amount: 7.0,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS" as BillingInterval,
  },
};

export async function createCharge({
  shop,
  plan,
  returnUrl,
  billing,
}: CreateChargeParams): Promise<ChargeResult> {
  try {
    const config = PRICING_TIERS[plan];

    if (!config) {
      return { success: false, error: "Invalid plan" };
    }

    const charge = await billing.request({
      plan,
      isTest: process.env.NODE_ENV === "development",
      ...config,
      returnUrl,
    });

    return {
      success: true,
      confirmationUrl: charge.confirmationUrl,
    };
  } catch (error) {
    console.error("Error creating charge:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
