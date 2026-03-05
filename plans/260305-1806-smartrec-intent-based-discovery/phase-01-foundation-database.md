# Phase 01 — Foundation & Database

## Context Links
- Parent: [plan.md](plan.md)
- PRD: [PRD.0.1.md](/Users/bbuser/Documents/oke-la/PRD.0.1.md) Section 4
- Research: [Intent Engine Architecture](reports/researcher-02-intent-engine-architecture.md)

## Overview
- **Priority:** P1 — Critical path, blocks all other phases
- **Effort:** 1h
- **Status:** pending
- **Description:** Set up Prisma models, Shopify API service layer, substitution engine, and app configuration. This is the data foundation everything else builds on.

## Key Insights
- Current scopes include `write_products,write_themes,write_content` — strip to `read_products,read_orders` only (minimal permissions = easier App Store review)
- Existing Prisma schema has only `Session` model — extend with SmartRec-specific models
- SQLite + in-memory LRU is sufficient for MVP caching (research report confirms)
- Substitution map built from order line item co-occurrence, batch nightly, cached 4h
- Webhooks API version is `2023-07` — should update to match `October25` API version

## Requirements

### Functional
- F-01: Prisma models for merchant settings, substitution cache, analytics events
- F-02: Shopify GraphQL service to fetch products and orders
- F-03: Substitution engine that builds "view A → buy B" patterns from order history
- F-04: In-memory LRU cache with 4h TTL for substitution lookups
- F-05: App Proxy configuration in `shopify.app.toml`

### Non-Functional
- NF-01: Substitution map computation completes in <10s for 500 orders
- NF-02: Cache lookup <1ms (in-memory), <10ms (SQLite fallback)
- NF-03: Minimal scopes — only `read_products,read_orders`

## Architecture

### Data Flow
```
Shopify Orders API → substitution.server.ts → SubstitutionCache (SQLite)
                                                    ↓
                                              In-memory LRU (4h TTL)
                                                    ↓
                                          API routes (Phase 3) serve to storefront
```

### Prisma Models

```prisma
model SmartRecSettings {
  id                    String   @id @default(cuid())
  shop                  String   @unique
  enabled               Boolean  @default(true)
  // Intent score thresholds per use case
  ucHesitationMin       Int      @default(56)
  ucHesitationMax       Int      @default(89)
  ucCompareEnabled      Boolean  @default(true)
  ucLostBackNavMin      Int      @default(3)
  ucCartHesitationSec   Int      @default(60)
  // Widget config
  widgetPosition        String   @default("below_description")
  maxAlternatives       Int      @default(2)
  // Timestamps
  substitutionBuiltAt   DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model SubstitutionCache {
  id          String   @id @default(cuid())
  shop        String
  productA    String   // Product GID viewed
  productB    String   // Product GID purchased instead
  score       Float    // Co-occurrence score 0-1
  method      String   @default("copurchase") // "copurchase" | "tag_fallback"
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@unique([shop, productA, productB])
  @@index([shop, productA])
  @@index([expiresAt])
}

model AnalyticsEvent {
  id          String   @id @default(cuid())
  shop        String
  sessionId   String   // Anonymous browser session
  eventType   String   // "impression" | "click" | "dismiss" | "add_to_cart"
  widgetType  String   // "alternative_nudge" | "comparison_bar" | "tag_navigator" | "trust_nudge"
  productId   String?
  intentScore Int?
  metadata    String?  // JSON string for extra data
  createdAt   DateTime @default(now())

  @@index([shop, createdAt])
  @@index([shop, widgetType])
}
```

### In-Memory Cache

```typescript
// app/lib/cache.server.ts
// Use lru-cache package (or simple Map with TTL check)
// Key: `${shop}:${productId}` → Value: SubstitutionResult[]
// Max entries: 1000, TTL: 4 hours
```

## Related Code Files

### Files to Modify
- `prisma/schema.prisma` — Add 3 new models
- `shopify.app.toml` — Update scopes to `read_products,read_orders`; add app proxy config; update webhooks api_version to `2025-10`
- `package.json` — Add `lru-cache` dependency

### Files to Create
- `app/lib/shopify-api.server.ts` — GraphQL queries: `fetchProducts()`, `fetchOrders()`, `fetchProductsByIds()`
- `app/lib/substitution.server.ts` — `buildSubstitutionMap(shop, admin)`, `getAlternatives(shop, productId)`
- `app/lib/cache.server.ts` — In-memory LRU wrapper with TTL
- `app/lib/types.ts` — Shared TypeScript interfaces (SubstitutionResult, IntentAction, SignalPayload)
- `prisma/migrations/[timestamp]_add_smartrec_models/` — Auto-generated migration

### Files to Delete
- None

## Implementation Steps

1. **Update `shopify.app.toml`**
   - Set `scopes = "read_products,read_orders"`
   - Update `[webhooks] api_version = "2025-10"`
   - Add app proxy section:
     ```toml
     [app_proxy]
     url = "https://<app-url>/api/proxy"
     subpath = "smartrec"
     prefix = "apps"
     ```

2. **Update `prisma/schema.prisma`**
   - Add `SmartRecSettings`, `SubstitutionCache`, `AnalyticsEvent` models (schema above)
   - Run `npx prisma migrate dev --name add_smartrec_models`

3. **Create `app/lib/types.ts`**
   ```typescript
   export interface SubstitutionResult {
     productId: string;
     title: string;
     price: string;
     imageUrl: string;
     score: float;
     method: "copurchase" | "tag_fallback";
   }

   export interface IntentAction {
     type: "none" | "alternative_nudge" | "comparison_bar" | "tag_navigator" | "trust_nudge";
     data?: Record<string, unknown>;
   }

   export interface SignalPayload {
     sessionId: string;
     shop: string;
     score: number;
     pageType: "product" | "cart" | "collection" | "home";
     currentProduct?: string;
     signals: {
       timeOnProduct?: number;
       scrollDepth?: number;
       reviewHover?: boolean;
       sizeChartOpen?: boolean;
       imageGallerySwipes?: number;
       backNavCount?: number;
       comparePattern?: boolean;
       cartHesitationSec?: number;
       returningVisitor?: boolean;
     };
     viewedProducts?: Array<{ id: string; timestamp: number }>;
     cartItems?: string[];
   }
   ```

4. **Create `app/lib/cache.server.ts`**
   - Install `lru-cache`: `npm install lru-cache`
   - Implement LRU with max 1000 entries, TTL 4h (14400000ms)
   - Export `getFromCache(key)`, `setInCache(key, value)`, `invalidateCache(shop)`

5. **Create `app/lib/shopify-api.server.ts`**
   - `fetchProducts(admin, options)` — paginated product query (id, title, handle, images, tags, productType, priceRange)
   - `fetchOrders(admin, options)` — last 30 days orders with line items (productId, quantity, title)
   - `fetchProductsByIds(admin, ids)` — batch fetch specific products for widget rendering
   - All functions use cursor-based pagination, handle rate limiting via retry with backoff

6. **Create `app/lib/substitution.server.ts`**
   - `buildSubstitutionMap(shop, admin)`:
     1. Fetch last 30 days orders
     2. For each order, extract all product IDs from line items
     3. Build co-occurrence matrix: for each pair (A, B) in same order, increment count
     4. Normalize scores to 0-1 range
     5. Write top pairs to `SubstitutionCache` table with 4h TTL
     6. Update `SmartRecSettings.substitutionBuiltAt`
   - `getAlternatives(shop, productId, limit=2)`:
     1. Check in-memory cache first
     2. Fall back to SQLite `SubstitutionCache` query
     3. If no results: tag-based fallback — find products sharing most tags with target
     4. Return array of `SubstitutionResult`

7. **Verify setup**
   - Run `npm run setup` (prisma generate + migrate)
   - Run `npm run typecheck` to verify no type errors

## Todo List
- [ ] Update shopify.app.toml scopes and app proxy config
- [ ] Add Prisma models and run migration
- [ ] Create app/lib/types.ts
- [ ] Install lru-cache and create cache.server.ts
- [ ] Create shopify-api.server.ts with GraphQL queries
- [ ] Create substitution.server.ts with map builder + alternatives lookup
- [ ] Run typecheck and verify build

## Success Criteria
- Prisma migration succeeds, all 3 new models exist
- `buildSubstitutionMap()` processes test store orders and writes cache entries
- `getAlternatives()` returns 2 products for a given product ID (copurchase or tag fallback)
- `npm run typecheck` passes with no errors
- App installs on dev store with updated scopes

## Risk Assessment
- **Order volume too low:** If dev store has <10 orders, substitution map will be sparse → tag fallback handles this
- **API rate limits:** Fetching 500+ orders may hit rate limits → implement cursor pagination + backoff
- **Schema migration on existing installs:** Need `prisma migrate deploy` on next deploy → already in `npm run setup`

## Security Considerations
- API service functions require `admin` session object — never expose raw admin token
- App Proxy requests validated by Shopify signature (handled in Phase 3)
- No PII stored in analytics — only anonymous session IDs

## Next Steps
- Phase 2 uses `shopify-api.server.ts` to fetch product data for widget rendering
- Phase 3 creates API routes that call `getAlternatives()` and `substitution.server.ts`
- Phase 5 reads `SmartRecSettings` and `AnalyticsEvent` for dashboard
