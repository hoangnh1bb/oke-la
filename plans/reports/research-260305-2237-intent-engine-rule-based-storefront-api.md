# Research Report: Intent Engine API — Rule-Based + Shopify Storefront API

**Date:** 2026-03-05
**Sources consulted:** 5 (Shopify official docs, community, engineering blog)

## Executive Summary

SmartRec Intent Engine API combines **rule-based behavioral analysis** (when to intervene) with **Shopify Storefront API ML recommendations** (what to recommend). Key finding: Storefront API `productRecommendations` supports `intent` argument (`RELATED` / `COMPLEMENTARY`) — currently unused in our code, should be leveraged for better recommendations per UC context.

## Architecture Flow

```
Shopper browses store
        |
Signal Collector (theme extension JS)
  - Tracks: time on page, scroll depth, size chart opens,
    back navigation, cart hesitation, gallery swipes, etc.
  - Computes intent score (0-100)
  - Maintains session state in localStorage
        |
POST /apps/smartrec/api/intent (via Shopify App Proxy)
        |
   [HMAC Validation] — Shopify signs all proxy requests
        |
   [Intent Engine] — Rule-based decision layer
        |
   ┌─ Score < 30 ────→ NONE (browsing, don't interrupt)
   ├─ Score >= 90 ───→ NONE (decided, don't distract)
   └─ Score 30-89 ───→ UC Handler Chain (first-match-wins)
        |
   ┌─ UC-02: Compare pattern ──→ comparison_bar
   ├─ UC-01: Hesitation ────────→ alternative_nudge (needs product data)
   ├─ UC-03: Lost shopper ─────→ tag_navigator
   └─ UC-04: Cart doubt ───────→ trust_nudge
        |
   [Product Data Layer] — 4-tier fallback strategy
   ├─ Tier 1: Substitution patterns (Admin API — order history)
   ├─ Tier 2: Shopify ML Recommendations (Storefront API)
   ├─ Tier 3: Similar products by type+tags (Admin API)
   └─ Tier 4: Session fallback (no API call)
        |
   JSON response → Widget Renderer (theme extension JS)
```

## Two Layers Explained

### Layer 1: Rule-Based Engine (WHEN + WHAT widget)

Pure logic, no external API calls. Evaluates shopper behavior signals against configurable thresholds.

| UC | Trigger Rules | Widget | Philosophy |
|---|---|---|---|
| UC-02 | comparePattern=true + >=2 products same type viewed >30s each | comparison_bar | Help compare, don't push |
| UC-01 | score 56-89 + (sizeChartOpen OR reviewHover) on product page | alternative_nudge | Uncertain shopper, show options |
| UC-03 | backNavCount >= 3 + empty cart | tag_navigator | Lost, help navigate by interest |
| UC-04 | cart page + cartHesitation > 60s | trust_nudge | Reassure with social proof |

Settings are **per-merchant configurable** via SmartRecSettings (Prisma/SQLite). Each UC has enable/disable toggle + threshold params.

### Layer 2: Shopify Storefront API (WHAT products)

Only UC-01 and GET /api/alternatives need product data from Shopify.

**Storefront API `productRecommendations`:**
- Returns up to 10 products per query
- Supports `intent` argument:
  - `RELATED` — "You may also like" (auto-generated from sales data, descriptions, collections)
  - `COMPLEMENTARY` — "Pair it with" (requires Shopify Search & Discovery app config)
- No admin auth needed — uses `unauthenticated.storefront(shop)`
- ML model trained on: purchase history, product descriptions, collection relationships

**Current implementation uses default intent (RELATED).**

**Recommendation:** Use `RELATED` for UC-01 (hesitating shopper wants alternatives) and `COMPLEMENTARY` for potential future cart upsell UC.

### 4-Tier Product Finder Strategy

```
Tier 1: Substitution Map (Admin API)
  - Analyze order history: products frequently bought instead of current product
  - Best quality but needs order volume
  - Cache: SubstitutionCache table (Prisma)

Tier 2: Shopify ML Recommendations (Storefront API)  ← NEW: switched from Admin API
  - productRecommendations(productId, intent: RELATED)
  - Auto-improves as store gets more traffic/orders
  - No admin scope needed

Tier 3: Similar Products (Admin API)
  - products(query: "product_type:'shoes'", sortKey: BEST_SELLING)
  - Ranked by tag overlap with current product
  - Reliable fallback, always returns results if store has products

Tier 4: Session Fallback (no API)
  - Same product type from shopper's viewed products in current session
  - Always available, lowest quality
  - Zero latency
```

## API Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /apps/smartrec/api/intent | HMAC | Core intent evaluation |
| GET | /apps/smartrec/api/alternatives | HMAC | Direct product alternatives |
| GET | /apps/smartrec/api/config | HMAC | Merchant settings for widget |
| POST | /apps/smartrec/api/track | HMAC | Analytics event tracking |

All endpoints go through Shopify App Proxy → `/api/proxy/*` catch-all route.

## Key Differences: Admin API vs Storefront API

| Aspect | Admin API | Storefront API |
|---|---|---|
| Auth | Offline session token (needs scopes) | Public, no admin auth |
| Rate limits | 50 points/second | Higher, designed for storefront traffic |
| `productRecommendations` | Available but needs `read_products` | Available, supports `intent` arg |
| Product search/filter | Full query syntax | Limited |
| Order access | Yes (`read_orders`) | No |
| Best for | Substitution maps, similar products | ML recommendations |

## Caching Strategy

- **Memory cache:** 4h TTL for all Shopify API responses
- **SubstitutionCache table:** Prisma/SQLite, rebuilt periodically from order data
- **Per-product per-shop:** Cache key includes shop + productId/productType

## Action Item

Update `fetchShopifyRecommendations()` to pass `intent: RELATED` explicitly:

```graphql
productRecommendations(productId: $productId, intent: RELATED) {
  ...
}
```

This makes the intent explicit and future-proofs for adding COMPLEMENTARY in cart-related UCs.

## Unresolved Questions

1. Should UC-04 (cart doubt) use `COMPLEMENTARY` intent to suggest add-ons instead of trust nudge?
2. What's the minimum order volume needed for Shopify ML to return meaningful recommendations?
3. Should we add a `productRecommendations` with `handle` instead of `id` for cleaner storefront integration?

## Sources

- [productRecommendations — Storefront API](https://shopify.dev/docs/api/storefront/latest/queries/productRecommendations)
- [ProductRecommendationIntent enum](https://shopify.dev/docs/api/storefront/latest/enums/ProductRecommendationIntent)
- [Unauthenticated Storefront — shopify-app-remix](https://shopify.dev/docs/api/shopify-app-remix/v2/unauthenticated/unauthenticated-storefront)
- [About App Proxies](https://shopify.dev/docs/apps/build/online-store/app-proxies)
- [Product Recommendations — Theme Merchandising](https://shopify.dev/docs/storefronts/themes/product-merchandising/recommendations)
- [Generative Recommender — Shopify Engineering](https://shopify.engineering/generative-recommendations)
