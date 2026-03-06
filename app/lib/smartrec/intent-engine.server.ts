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
  ucHesitationMin: 56,
  ucHesitationMax: 89,
  ucCompareEnabled: true,
  ucLostEnabled: true,
  ucLostBackNavMin: 3,
  maxAlternatives: 2,
};

async function loadSettings(shop: string): Promise<UseCaseSettings> {
  const row = await prisma.smartRecSettings.findUnique({ where: { shop } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    enabled: row.enabled,
    ucHesitationEnabled: row.alternativeNudge,
    ucHesitationMin: row.ucHesitationMin,
    ucHesitationMax: row.ucHesitationMax,
    ucCompareEnabled: row.comparisonBar,
    ucLostEnabled: row.tagNavigator,
    ucLostBackNavMin: row.ucLostBackNavMin,
    maxAlternatives: row.maxAlternatives,
  };
}

export async function evaluateIntent(payload: SignalPayload): Promise<IntentAction> {
  const settings = await loadSettings(payload.shop);

  // Master kill switch
  if (!settings.enabled) return NONE_ACTION;

  // Score gates — PRD Section 2.3
  if (payload.score < 30) return NONE_ACTION;  // Browsing, don't interrupt
  if (payload.score >= 90) return NONE_ACTION;  // Ready to buy, don't distract!

  // Iterate registered UC handlers in priority order — first match wins
  for (const handler of useCaseHandlers) {
    if (!handler.isEnabled(settings)) continue;

    const action = await handler.evaluate(payload, settings);
    if (action) return action;
  }

  return NONE_ACTION;
}
