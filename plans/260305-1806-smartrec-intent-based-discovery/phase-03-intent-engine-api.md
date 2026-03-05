# Phase 03 — Intent Engine API Routes

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: [Phase 01](phase-01-foundation-database.md) (substitution engine, types, cache)
- Depends on: [Phase 02](phase-02-theme-extension-signal-collector.md) (App Proxy config, signal payload format)
- PRD: Section 4.4 (Intent API), Section 2.3 (Score → Action Mapping)
- Research: [Intent Engine Architecture](reports/researcher-02-intent-engine-architecture.md) Sections 3-4

## Overview
- **Priority:** P1
- **Effort:** 1.5h
- **Status:** done
- **Description:** Build server-side API routes that receive intent signals from storefront via App Proxy, run the score-to-action rule engine, and return widget instructions. Also: alternatives endpoint, config endpoint, and analytics tracking endpoint.

## Key Insights
- All storefront requests arrive via App Proxy at `/api/proxy` — single entry point that validates Shopify HMAC then routes internally
- Resource routes (no UI component export) — only `loader`/`action` functions
- No `authenticate.admin()` on storefront-facing routes — these are unauthenticated public endpoints
- App Proxy adds `X-Shopify-Shop-Domain`, `X-Shopify-Hmac-Sha256` headers for validation
- Score-to-action mapping is the core differentiator: score 90-100 = NO recommendation (PRD F-03)
- Rule engine evaluates UCs in priority order: UC-02 (compare) > UC-01 (hesitation) > UC-03 (lost) > UC-04 (cart doubt)

## Requirements

### Functional
- F-01: App Proxy entry route validates Shopify HMAC signature
- F-02: POST `/api/intent` — receives SignalPayload, returns IntentAction
- F-03: Score-to-action mapping per PRD Section 2.3 (0-30=none, 31-55=quiet, 56-75=alternatives, 76-89=social proof, 90-100=none)
- F-04: GET `/api/alternatives` — returns 2 alternative products for a given product ID
- F-05: GET `/api/config` — returns merchant SmartRecSettings for storefront
- F-06: POST `/api/track` — logs widget impression/click/dismiss events to AnalyticsEvent
- F-07: UC-specific logic: comparison_bar, alternative_nudge, tag_navigator, trust_nudge

### Non-Functional
- NF-01: Response time <200ms for intent evaluation
- NF-02: HMAC validation on every App Proxy request
- NF-03: Graceful degradation — return `{ type: "none" }` on any error

## Architecture

### Request Flow via App Proxy
```
Storefront JS
  → POST https://{shop}.myshopify.com/apps/smartrec/api/intent
    → Shopify App Proxy infrastructure (adds HMAC headers)
      → App server: app/routes/api.proxy.$.tsx (catch-all)
        → Validates HMAC
        → Routes to internal handler based on path:
            /api/intent        → intentHandler()
            /api/alternatives  → alternativesHandler()
            /api/config        → configHandler()
            /api/track         → trackHandler()
        → Returns JSON response
```

### Alternative: Direct Resource Routes
If App Proxy routing proves complex, create individual resource routes with CORS headers instead. But App Proxy is preferred (no CORS needed, Shopify-managed auth).

### Score-to-Action Decision Tree
```
score < 30          → { type: "none" }
score 90-100        → { type: "none" }  // KEY DIFFERENTIATOR
score 31-55         → quiet suggestion (future v1.1, return "none" for MVP)
score 56-89:
  ├── comparePattern detected?     → { type: "comparison_bar", data: {productA, productB} }
  ├── sizeChartOpen || reviewHover → { type: "alternative_nudge", data: {products: [2 alts]} }
  ├── backNavCount >= 3 + cart empty → { type: "tag_navigator", data: {tags: [top 3]} }
  └── cart page + hesitation > 60s  → { type: "trust_nudge", data: {items: [...trust data]} }
  └── fallback                      → { type: "none" }
```

## Related Code Files

### Files Created
- `app/routes/api.proxy.$.tsx` — App Proxy catch-all route, HMAC validation, request routing
- `app/lib/smartrec/intent-engine.server.ts` — Score-to-action rule engine with pluggable UC handlers
- `app/lib/smartrec/proxy-auth.server.ts` — Shopify App Proxy HMAC signature validation (timing-safe)
- `app/lib/smartrec/tag-extractor.server.ts` — Extract common tags from viewed products for UC-03
- `app/lib/smartrec/types.ts` — All shared interfaces (SignalPayload, IntentAction, UseCaseHandler, etc.)
- `app/lib/smartrec/memory-cache.server.ts` — In-memory TTL cache (4h default)
- `app/lib/smartrec/shopify-product-query.server.ts` — Shopify Admin API queries (similar products, ML recommendations, order history)
- `app/lib/smartrec/substitution-map-builder.server.ts` — Build substitution patterns from order history
- `app/lib/smartrec/alternatives-finder.server.ts` — 4-tier alternative product strategy
- `app/lib/smartrec/use-cases/use-case-registry.server.ts` — Plug-and-play UC handler registry
- `app/lib/smartrec/use-cases/uc01-hesitating-shopper.server.ts` — UC-01 handler
- `app/lib/smartrec/use-cases/uc02-comparison-shopper.server.ts` — UC-02 handler
- `app/lib/smartrec/use-cases/uc03-lost-shopper-tag-navigator.server.ts` — UC-03 handler
- `app/lib/smartrec/use-cases/uc04-cart-doubt-trust-nudge.server.ts` — UC-04 handler

### Files Modified
- `prisma/schema.prisma` — Added SmartRecSettings, SubstitutionCache, AnalyticsEvent models

### Files Deleted
- None

### Architecture Decisions (Post-Implementation)
- **Strategy + Registry Pattern** for UC handlers — each UC is an independent module implementing `UseCaseHandler` interface, registered in `use-case-registry.server.ts`. Easy to plug/unplug.
- **4-tier alternatives strategy**: substitution (order history) → Shopify ML (`productRecommendations`) → tag matching (Admin API) → session fallback
- **Shopify ML integration**: `productRecommendations` GraphQL query added as Tier 2, uses Shopify's built-in ML model trained on global purchase/browsing patterns. No extra scope needed (uses existing `read_products`).
- All modules under `app/lib/smartrec/` namespace for clean separation

## Implementation Steps

### 1. Create `app/lib/proxy-auth.server.ts`

```typescript
import crypto from "crypto";

/**
 * Validates Shopify App Proxy HMAC signature.
 * Shopify sends query params with signature — verify against API secret.
 */
export function validateProxySignature(url: URL): boolean {
  const params = new URLSearchParams(url.search);
  const signature = params.get("signature");
  if (!signature) return false;

  params.delete("signature");
  // Sort params alphabetically, join as key=value pairs
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("");

  const computed = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
    .update(sortedParams)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(computed, "hex")
  );
}
```

### 2. Create `app/routes/api.proxy.$.tsx` (App Proxy Catch-All)

```typescript
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { validateProxySignature } from "../lib/proxy-auth.server";
import { evaluateIntent } from "../lib/intent-engine.server";
import { getAlternatives } from "../lib/substitution.server";
import { extractCommonTags } from "../lib/tag-extractor.server";
import prisma from "../db.server";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(msg: string, status: number) {
  return jsonResponse({ error: msg }, status);
}

// Extract sub-path from catch-all: /api/proxy/api/intent → "api/intent"
function getSubPath(params: Record<string, string | undefined>): string {
  return params["*"] || "";
}

// GET requests (config, alternatives)
export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  if (!validateProxySignature(url)) {
    return errorResponse("Unauthorized", 401);
  }

  const subPath = getSubPath(params);
  const shop = url.searchParams.get("shop") || "";

  try {
    switch (subPath) {
      case "api/config":
        return handleGetConfig(shop);
      case "api/alternatives":
        return handleGetAlternatives(url, shop);
      default:
        return errorResponse("Not found", 404);
    }
  } catch {
    return jsonResponse({ type: "none" });
  }
}

// POST requests (intent, track)
export async function action({ request, params }: ActionFunctionArgs) {
  const url = new URL(request.url);
  if (!validateProxySignature(url)) {
    return errorResponse("Unauthorized", 401);
  }

  const subPath = getSubPath(params);

  try {
    const body = await request.json();
    switch (subPath) {
      case "api/intent":
        return handlePostIntent(body);
      case "api/track":
        return handlePostTrack(body);
      default:
        return errorResponse("Not found", 404);
    }
  } catch {
    return jsonResponse({ type: "none" });
  }
}

// ── Route Handlers ──

async function handlePostIntent(body: SignalPayload) {
  const action = await evaluateIntent(body);
  return jsonResponse(action);
}

async function handleGetConfig(shop: string) {
  const settings = await prisma.smartRecSettings.findUnique({ where: { shop } });
  if (!settings) return jsonResponse({ enabled: false });
  return jsonResponse({
    enabled: settings.enabled,
    ucHesitationMin: settings.ucHesitationMin,
    ucHesitationMax: settings.ucHesitationMax,
    ucCompareEnabled: settings.ucCompareEnabled,
    ucLostBackNavMin: settings.ucLostBackNavMin,
    ucCartHesitationSec: settings.ucCartHesitationSec,
    maxAlternatives: settings.maxAlternatives,
  });
}

async function handleGetAlternatives(url: URL, shop: string) {
  const productId = url.searchParams.get("productId");
  if (!productId) return errorResponse("productId required", 400);
  const alts = await getAlternatives(shop, productId, 2);
  return jsonResponse({ products: alts });
}

async function handlePostTrack(body: {
  shop: string; sessionId: string; eventType: string;
  widgetType: string; productId?: string; intentScore?: number;
  metadata?: Record<string, unknown>;
}) {
  await prisma.analyticsEvent.create({
    data: {
      shop: body.shop,
      sessionId: body.sessionId,
      eventType: body.eventType,
      widgetType: body.widgetType,
      productId: body.productId || null,
      intentScore: body.intentScore || null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    },
  });
  return jsonResponse({ ok: true });
}
```

### 3. Create `app/lib/intent-engine.server.ts`

```typescript
import type { SignalPayload, IntentAction } from "./types";
import { getAlternatives } from "./substitution.server";
import { extractCommonTags } from "./tag-extractor.server";
import prisma from "../db.server";

/**
 * Core rule engine: SignalPayload → IntentAction
 * Evaluates UCs in priority order. Returns first match.
 */
export async function evaluateIntent(payload: SignalPayload): Promise<IntentAction> {
  const { shop, score, pageType, signals, viewedProducts, cartItems } = payload;

  // Load merchant settings (with defaults)
  const settings = await prisma.smartRecSettings.findUnique({ where: { shop } });
  if (!settings?.enabled) return { type: "none" };

  const hesitMin = settings.ucHesitationMin;   // default 56
  const hesitMax = settings.ucHesitationMax;    // default 89
  const backNavMin = settings.ucLostBackNavMin; // default 3
  const cartHesitSec = settings.ucCartHesitationSec; // default 60
  const maxAlts = settings.maxAlternatives;     // default 2

  // Score gates
  if (score < 30) return { type: "none" };
  if (score >= 90) return { type: "none" }; // KEY: don't distract ready buyers

  // UC-02: Comparison Shopper (highest priority on product pages)
  if (
    pageType === "product" &&
    settings.ucCompareEnabled &&
    signals.comparePattern &&
    viewedProducts && viewedProducts.length >= 2
  ) {
    const current = viewedProducts[viewedProducts.length - 1];
    const previous = viewedProducts[viewedProducts.length - 2];
    return {
      type: "comparison_bar",
      data: { productA: previous.id, productB: current.id },
    };
  }

  // UC-01: Hesitating Shopper
  if (
    pageType === "product" &&
    score >= hesitMin && score <= hesitMax &&
    (signals.sizeChartOpen || signals.reviewHover)
  ) {
    const currentProduct = viewedProducts?.[viewedProducts.length - 1]?.id;
    if (currentProduct) {
      const alts = await getAlternatives(shop, currentProduct, maxAlts);
      if (alts.length > 0) {
        return { type: "alternative_nudge", data: { products: alts } };
      }
    }
  }

  // UC-03: Lost Shopper
  if (
    (signals.backNavCount || 0) >= backNavMin &&
    (!cartItems || cartItems.length === 0) &&
    viewedProducts && viewedProducts.length >= 3
  ) {
    const tags = await extractCommonTags(
      shop,
      viewedProducts.map((v) => v.id)
    );
    if (tags.length > 0) {
      return { type: "tag_navigator", data: { tags: tags.slice(0, 3) } };
    }
  }

  // UC-04: Cart Doubt
  if (
    pageType === "cart" &&
    (signals.cartHesitationSec || 0) >= cartHesitSec &&
    cartItems && cartItems.length > 0
  ) {
    // Return basic trust nudge — product ratings/reviews fetched client-side or from cache
    return {
      type: "trust_nudge",
      data: { cartItemIds: cartItems },
    };
  }

  return { type: "none" };
}
```

### 4. Create `app/lib/tag-extractor.server.ts`

```typescript
import prisma from "../db.server";
import { getFromCache, setInCache } from "./cache.server";

/**
 * Extract most common tags from a list of viewed products.
 * Used by UC-03 (Lost Shopper) to suggest category filters.
 */
export async function extractCommonTags(
  shop: string,
  productIds: string[]
): Promise<string[]> {
  // Check cache first
  const cacheKey = `tags:${shop}:${productIds.sort().join(",")}`;
  const cached = getFromCache<string[]>(cacheKey);
  if (cached) return cached;

  // Query products for their tags via SubstitutionCache metadata
  // or fetch from Shopify API if needed (requires admin session — fallback to cached product data)
  // For MVP: store product tags in localStorage session and pass them in payload
  // This avoids needing an admin API call on every tag extraction

  // Fallback: extract tags from signal payload (passed from client)
  // The signal collector already has product tags from the Liquid data attributes

  // Count tag frequency
  const tagCount = new Map<string, number>();
  // Tags will be passed in the payload from client-side collection
  // This function processes them server-side for ranking

  const sorted = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  setInCache(cacheKey, sorted);
  return sorted;
}
```

**Note:** In practice, tags are collected client-side from Liquid data attributes and sent in the payload. The server just ranks them. Update `SignalPayload` type to include `productTags?: Record<string, string[]>`.

### 5. Update `app/lib/types.ts`

Add to existing types:
```typescript
// Extend SignalPayload with tag data for UC-03
export interface SignalPayload {
  // ... existing fields ...
  productTags?: Record<string, string[]>; // productId → tags[]
}
```

### 6. Verify Routes

```bash
cd /Users/bbuser/Documents/oke-la
npm run typecheck
npm run dev
# Test via curl through App Proxy or directly:
# curl -X POST http://localhost:3000/api/proxy/api/intent -H "Content-Type: application/json" -d '{"shop":"test","score":65,"pageType":"product","signals":{"sizeChartOpen":true}}'
```

## Todo List
- [x] Create app/lib/smartrec/proxy-auth.server.ts (HMAC validation with timing-safe compare)
- [x] Create app/routes/api.proxy.$.tsx (catch-all proxy route)
- [x] Implement handlePostIntent with intent engine call
- [x] Implement handleGetConfig reading SmartRecSettings
- [x] Implement handleGetAlternatives calling substitution engine + Shopify API
- [x] Implement handlePostTrack writing to AnalyticsEvent
- [x] Create app/lib/smartrec/intent-engine.server.ts (rule engine with pluggable UC handlers)
- [x] Implement UC priority: UC-02 > UC-01 > UC-03 > UC-04 (via use-case-registry)
- [x] Enforce score 90-100 = no recommendation (F-03 acceptance criteria)
- [x] Create app/lib/smartrec/tag-extractor.server.ts
- [x] Update types.ts with all shared interfaces (SignalPayload, IntentAction, UseCaseHandler, etc.)
- [x] Create 4-tier alternatives strategy (substitution → Shopify ML → tag matching → session fallback)
- [x] Add Shopify `productRecommendations` API integration (Shopify ML-powered recommendations)
- [x] Create in-memory TTL cache (4h default) for API responses
- [x] Create substitution map builder from order history
- [x] Run typecheck — SmartRec modules pass (no errors)
- [ ] Test intent endpoint with various score/signal combos (requires dev store)

## Success Criteria
- POST `/apps/smartrec/api/intent` with score=65 + sizeChartOpen=true → returns `alternative_nudge`
- POST with score=95 → returns `{ type: "none" }` (ready buyer, no distraction)
- POST with score=20 → returns `{ type: "none" }` (just browsing)
- POST with backNavCount=4 + cartItems=[] → returns `tag_navigator`
- POST with pageType=cart + cartHesitationSec=90 → returns `trust_nudge`
- GET `/apps/smartrec/api/config` → returns merchant settings JSON
- POST `/apps/smartrec/api/track` → creates AnalyticsEvent row in SQLite
- Invalid HMAC → 401 response
- Any error → graceful `{ type: "none" }` fallback

## Risk Assessment
- **HMAC validation complexity:** App Proxy signature format may differ from documented. Mitigation: test with real Shopify proxy request; log raw params for debugging.
- **Race condition on settings:** If merchant changes thresholds while shopper is browsing. Mitigation: acceptable — next request picks up new settings.
- **Tag extraction without admin session:** Storefront routes have no admin token. Mitigation: pass tags from client-side Liquid data attributes in payload.

## Security Considerations
- HMAC validation on every request — reject unsigned requests
- Rate limit tracking endpoint to prevent analytics spam (future: add IP-based rate limiting)
- No admin API calls from storefront routes — all product data comes from cache or client payload
- Sanitize all user input before Prisma queries (Prisma parameterizes by default)

## Next Steps
- Phase 4 implements widget-renderer.js that consumes IntentAction responses
- Phase 5 builds admin UI that reads/writes SmartRecSettings and queries AnalyticsEvent
