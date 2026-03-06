/**
 * shop-settings-adapter.server.ts
 * Bridge between new ShopSettings model and legacy UseCaseSettings interface.
 * Reads from ShopSettings first, falls back to SmartRecSettings for backward compat.
 * Creates default row if neither exists.
 */
import prisma from "../../db.server";
import type { UseCaseSettings } from "./types";

export interface ShopSettingsData {
  shop: string;
  enabled: boolean;
  thresholdBrowsing: number;
  thresholdConsidering: number;
  thresholdHighConsideration: number;
  thresholdStrongIntent: number;
  widgetAlternativeNudge: boolean;
  widgetComparisonBar: boolean;
  widgetTagNavigator: boolean;
  widgetTrustNudge: boolean;
  aiExplanationsEnabled: boolean;
  aiQuizEnabled: boolean;
  aiVisualEnabled: boolean;
  aiConciergeEnabled: boolean;
  agentName: string;
  agentColor: string;
  proactiveMessage: string;
  systemPromptOverride: string | null;
}

const DEFAULT_SHOP_SETTINGS: Omit<ShopSettingsData, "shop"> = {
  enabled: true,
  thresholdBrowsing: 30,
  thresholdConsidering: 55,
  thresholdHighConsideration: 75,
  thresholdStrongIntent: 89,
  widgetAlternativeNudge: true,
  widgetComparisonBar: true,
  widgetTagNavigator: true,
  widgetTrustNudge: true,
  aiExplanationsEnabled: true,
  aiQuizEnabled: true,
  aiVisualEnabled: false,
  aiConciergeEnabled: false,
  agentName: "SmartRec Assistant",
  agentColor: "#4A90E2",
  proactiveMessage: "Hi! Want to know more about this product?",
  systemPromptOverride: null,
};

/**
 * Get shop settings from new ShopSettings model.
 * Falls back to SmartRecSettings for backward compat.
 * Creates a default row in ShopSettings if neither exists.
 */
export async function getShopSettings(shop: string): Promise<ShopSettingsData> {
  // Try new ShopSettings model first
  try {
    const row = await prisma.shopSettings.findUnique({ where: { shop } });
    if (row) {
      return {
        shop: row.shop,
        enabled: row.enabled,
        thresholdBrowsing: row.thresholdBrowsing,
        thresholdConsidering: row.thresholdConsidering,
        thresholdHighConsideration: row.thresholdHighConsideration,
        thresholdStrongIntent: row.thresholdStrongIntent,
        widgetAlternativeNudge: row.widgetAlternativeNudge,
        widgetComparisonBar: row.widgetComparisonBar,
        widgetTagNavigator: row.widgetTagNavigator,
        widgetTrustNudge: row.widgetTrustNudge,
        aiExplanationsEnabled: row.aiExplanationsEnabled,
        aiQuizEnabled: row.aiQuizEnabled,
        aiVisualEnabled: row.aiVisualEnabled,
        aiConciergeEnabled: row.aiConciergeEnabled,
        agentName: row.agentName,
        agentColor: row.agentColor,
        proactiveMessage: row.proactiveMessage,
        systemPromptOverride: row.systemPromptOverride,
      };
    }
  } catch (e) {
    console.error("[SmartRec] getShopSettings ShopSettings read error:", e);
  }

  // Fallback: try legacy SmartRecSettings
  try {
    const legacy = await prisma.smartRecSettings.findUnique({ where: { shop } });
    if (legacy) {
      return {
        shop,
        enabled: legacy.enabled,
        thresholdBrowsing: legacy.thresholdBrowsing ?? DEFAULT_SHOP_SETTINGS.thresholdBrowsing,
        thresholdConsidering: legacy.thresholdConsidering ?? DEFAULT_SHOP_SETTINGS.thresholdConsidering,
        thresholdHighConsideration: legacy.thresholdHighIntent ?? DEFAULT_SHOP_SETTINGS.thresholdHighConsideration,
        thresholdStrongIntent: legacy.thresholdStrongIntent ?? DEFAULT_SHOP_SETTINGS.thresholdStrongIntent,
        widgetAlternativeNudge: legacy.alternativeNudge ?? DEFAULT_SHOP_SETTINGS.widgetAlternativeNudge,
        widgetComparisonBar: legacy.comparisonBar ?? DEFAULT_SHOP_SETTINGS.widgetComparisonBar,
        widgetTagNavigator: legacy.tagNavigator ?? DEFAULT_SHOP_SETTINGS.widgetTagNavigator,
        widgetTrustNudge: legacy.trustNudge ?? DEFAULT_SHOP_SETTINGS.widgetTrustNudge,
        aiExplanationsEnabled: DEFAULT_SHOP_SETTINGS.aiExplanationsEnabled,
        aiQuizEnabled: DEFAULT_SHOP_SETTINGS.aiQuizEnabled,
        aiVisualEnabled: DEFAULT_SHOP_SETTINGS.aiVisualEnabled,
        aiConciergeEnabled: DEFAULT_SHOP_SETTINGS.aiConciergeEnabled,
        agentName: DEFAULT_SHOP_SETTINGS.agentName,
        agentColor: DEFAULT_SHOP_SETTINGS.agentColor,
        proactiveMessage: DEFAULT_SHOP_SETTINGS.proactiveMessage,
        systemPromptOverride: DEFAULT_SHOP_SETTINGS.systemPromptOverride,
      };
    }
  } catch (e) {
    console.error("[SmartRec] getShopSettings SmartRecSettings fallback error:", e);
  }

  // No record — create default in new model
  try {
    await prisma.shopSettings.create({
      data: { shop, ...DEFAULT_SHOP_SETTINGS },
    });
  } catch (e) {
    // Race condition or DB error — return defaults without persisting
    console.error("[SmartRec] getShopSettings create default error:", e);
  }

  return { shop, ...DEFAULT_SHOP_SETTINGS };
}

/**
 * Map ShopSettingsData to UseCaseSettings for legacy intent engine compatibility.
 */
export function toUseCaseSettings(settings: ShopSettingsData): UseCaseSettings {
  return {
    enabled: settings.enabled,
    ucHesitationEnabled: settings.widgetAlternativeNudge,
    ucHesitationMin: settings.thresholdConsidering,
    ucHesitationMax: settings.thresholdStrongIntent,
    ucCompareEnabled: settings.widgetComparisonBar,
    ucLostEnabled: settings.widgetTagNavigator,
    ucLostBackNavMin: 3,
    maxAlternatives: 2,
  };
}
