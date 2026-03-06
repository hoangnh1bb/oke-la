/**
 * SmartRec shared types for Intent Engine API.
 * Used across proxy route, intent engine, and UC handlers.
 */

// Signal data collected client-side by signal-collector.js
export interface SignalData {
  timeOnProduct: number;
  scrollDepth: number;
  reviewHover: boolean;
  sizeChartOpen: boolean;
  imageGallerySwipes: number;
  backNavigation: boolean;
  cartHesitation: number;
  comparePattern: boolean;
  returningVisitor: boolean;
  trafficSourceKeyword: boolean;
}

// Product entry from client session's viewedProducts array
export interface ViewedProduct {
  id: string;
  type: string;
  tags: string[];
  title: string;
  price: string;
  image: string;
  url: string;
  timestamp: number;
}

// Current product context (null on cart pages)
export interface CurrentProduct {
  id: string;
  type: string;
  tags: string[];
  title: string;
  price: string;
  image: string;
  url: string;
}

// Payload sent from signal-collector.js to POST /api/intent
export interface SignalPayload {
  sessionId: string;
  shop: string;
  score: number;
  pageType: "product" | "cart" | string;
  signals: SignalData;
  viewedProducts: ViewedProduct[];
  currentProduct: CurrentProduct | null;
  cartProductIds: string[];
  backNavCount: number;
}

// Action returned to widget-renderer.js
export interface IntentAction {
  type: "none" | "alternative_nudge" | "comparison_bar" | "tag_navigator";
  data?: Record<string, unknown>;
}

// Pluggable Use Case handler interface — each UC implements this
export interface UseCaseHandler {
  id: string;
  // Check if this UC's feature flag is enabled in settings
  isEnabled(settings: UseCaseSettings): boolean;
  // Evaluate whether this UC should trigger, return action or null
  evaluate(payload: SignalPayload, settings: UseCaseSettings): Promise<IntentAction | null>;
}

// Subset of SmartRecSettings relevant to UC evaluation
export interface UseCaseSettings {
  enabled: boolean;
  // Widget toggles
  ucHesitationEnabled: boolean;
  ucCompareEnabled: boolean;
  ucLostEnabled: boolean;
  // Score thresholds (from dashboard)
  thresholdBrowsing: number;    // below this = skip (default 30)
  thresholdConsidering: number; // UC-01 lower bound (default 55)
  thresholdStrongIntent: number;// UC-01 upper bound (default 89)
  thresholdReadyToBuy: number;  // above this = skip (default 90)
  // UC-specific settings
  ucLostBackNavMin: number;
  maxAlternatives: number;
}

// Analytics tracking payload
export interface TrackPayload {
  shop: string;
  sessionId: string;
  eventType: "impression" | "click" | "dismiss";
  widgetType: string;
  productId?: string;
  intentScore?: number;
  metadata?: Record<string, unknown>;
}
