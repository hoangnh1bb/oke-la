/**
 * SmartRec Intent Engine — Core orchestrator.
 * Receives signal payload, loads merchant settings, iterates pluggable UC handlers.
 * Score gates: <30 = browsing (skip), 90+ = ready to buy (skip — KEY differentiator).
 */
import type { SignalPayload, IntentAction, UseCaseSettings } from "./types";
import { useCaseHandlers } from "./use-cases/use-case-registry.server";
import prisma from "../../db.server";

const NONE_ACTION: IntentAction = { type: "none" };

// Default settings when merchant has no record yet
const DEFAULT_SETTINGS: UseCaseSettings = {
  enabled: true,
  ucHesitationEnabled: true,
  ucCompareEnabled: true,
  ucLostEnabled: true,
  thresholdBrowsing: 30,
  thresholdConsidering: 55,
  thresholdStrongIntent: 89,
  thresholdReadyToBuy: 90,
  ucLostBackNavMin: 3,
  maxAlternatives: 2,
};

async function loadSettings(shop: string): Promise<UseCaseSettings> {
  const row = await prisma.smartRecSettings.findUnique({ where: { shop } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    enabled: row.enabled,
    ucHesitationEnabled: row.alternativeNudge,
    ucCompareEnabled: row.comparisonBar,
    ucLostEnabled: row.tagNavigator,
    thresholdBrowsing: row.thresholdBrowsing,
    thresholdConsidering: row.thresholdConsidering,
    thresholdStrongIntent: row.thresholdStrongIntent,
    thresholdReadyToBuy: row.thresholdReadyToBuy,
    ucLostBackNavMin: row.ucLostBackNavMin,
    maxAlternatives: row.maxAlternatives,
  };
}

export async function evaluateIntent(payload: SignalPayload): Promise<IntentAction> {
  const settings = await loadSettings(payload.shop);

  // Master kill switch
  if (!settings.enabled) return NONE_ACTION;

  // Score gates — use merchant-configurable thresholds
  if (payload.score < settings.thresholdBrowsing) return NONE_ACTION;  // Browsing, don't interrupt
  if (payload.score >= settings.thresholdReadyToBuy) return NONE_ACTION;  // Ready to buy, don't distract!

  // Iterate registered UC handlers in priority order — first match wins
  for (const handler of useCaseHandlers) {
    if (!handler.isEnabled(settings)) continue;

    const action = await handler.evaluate(payload, settings);
    if (action) return action;
  }

  return NONE_ACTION;
}
