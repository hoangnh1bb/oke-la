# Phase 04 — Database Schema & Prisma Models

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-app-config-and-permissions.md)
- PRD Section 2: Behavioral Signal Model
- PRD Section 4.1: Architecture — Session Store

## Overview
- **Priority:** P1 — All feature plans need data persistence
- **Status:** pending
- **Description:** Add Prisma models for merchant settings, signal events, product cache, and analytics. Keep models minimal for MVP — expand in feature plans.

## Key Insights
- Current DB: SQLite with only `Session` model (Shopify auth sessions)
- SQLite limits: single-writer, no concurrent writes — fine for MVP
- PRD uses localStorage for real-time signals + server for aggregates — DB stores aggregated data, not every raw event
- Product cache (4h TTL per PRD) avoids hammering Shopify Admin API
- Merchant settings stored per-shop — one config row per installed store

## Requirements

### Functional
- `ShopSettings` — per-shop widget config, score thresholds, enable/disable flags
- `ProductCache` — cached product data from Admin API (title, price, tags, image, ratings)
- `SignalAggregate` — aggregated behavioral signals per product per shop (view count, avg time, substitution data)
- `ActionLog` — log of actions triggered + clicks (for analytics dashboard)

### Non-functional
- Migrations via `prisma migrate deploy` (existing pattern)
- Indexes on shop + productId for fast lookups
- TTL-based cache invalidation for ProductCache (checked at query time)

## Architecture

```
┌─────────────────────────────────────────┐
│ Prisma/SQLite                           │
│                                         │
│  Session (existing)  — Shopify auth     │
│  ShopSettings        — per-shop config  │
│  ProductCache        — cached products  │
│  SignalAggregate     — per-product stats │
│  ActionLog           — triggered actions │
└─────────────────────────────────────────┘
```

## Related Code Files
- **Modify:** `prisma/schema.prisma` — add 4 new models
- **Run:** `npx prisma migrate dev --name add-smartrec-models`
- **Create:** `app/lib/db-helpers.server.ts` — helper functions for common queries
- **Create:** `app/lib/memory-cache.server.ts` — in-memory Map cache for hot data (validated: SQLite + in-memory)

## Implementation Steps

1. **Add models to `prisma/schema.prisma`:**

   ```prisma
   model ShopSettings {
     id        String   @id @default(cuid())
     shop      String   @unique
     enabled   Boolean  @default(true)

     // Score thresholds (customizable by merchant)
     thresholdBrowsing         Int @default(30)
     thresholdConsidering      Int @default(55)
     thresholdHighConsideration Int @default(75)
     thresholdStrongIntent     Int @default(89)

     // Widget toggles
     widgetAlternativeNudge Boolean @default(true)
     widgetComparisonBar    Boolean @default(true)
     widgetTagNavigator     Boolean @default(true)
     widgetTrustNudge       Boolean @default(true)

     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }

   model ProductCache {
     id            String   @id @default(cuid())
     shop          String
     shopifyProductId String
     handle        String
     title         String
     productType   String   @default("")
     price         Float
     imageUrl      String   @default("")
     tags          String   @default("")    // comma-separated
     rating        Float    @default(0)
     reviewCount   Int      @default(0)
     cachedAt      DateTime @default(now())

     @@unique([shop, shopifyProductId])
     @@index([shop, productType])
   }

   model SignalAggregate {
     id               String @id @default(cuid())
     shop             String
     shopifyProductId String
     viewCount        Int    @default(0)
     avgTimeOnPage    Float  @default(0)
     addToCartCount   Int    @default(0)
     purchaseCount    Int    @default(0)
     backNavCount     Int    @default(0)

     // Substitution: "viewed this, bought that" — JSON array of productIds
     substitutionProductIds String @default("[]")

     updatedAt DateTime @updatedAt

     @@unique([shop, shopifyProductId])
     @@index([shop])
   }

   model ActionLog {
     id         String   @id @default(cuid())
     shop       String
     actionType String   // alternative_nudge | comparison_bar | tag_navigator | trust_nudge
     productId  String?  // product context where action triggered
     clicked    Boolean  @default(false)
     convertedToCart Boolean @default(false)
     sessionId  String   // anonymous session identifier
     createdAt  DateTime @default(now())

     @@index([shop, actionType])
     @@index([shop, createdAt])
   }
   ```

2. **Run migration:**
   ```bash
   npx prisma migrate dev --name add-smartrec-models
   ```

3. **Create `app/lib/db-helpers.server.ts`:**
   ```ts
   import prisma from "../db.server";

   // Get or create shop settings with defaults
   export async function getShopSettings(shop: string) {
     return prisma.shopSettings.upsert({
       where: { shop },
       create: { shop },
       update: {},
     });
   }

   // Check if product cache is fresh (< 4 hours)
   export function isCacheFresh(cachedAt: Date): boolean {
     const FOUR_HOURS = 4 * 60 * 60 * 1000;
     return Date.now() - cachedAt.getTime() < FOUR_HOURS;
   }
   ```

4. **Create `app/lib/memory-cache.server.ts`** (validated: use in-memory Map for hot data):
   ```ts
   // In-memory cache for hot data (product cache, shop settings)
   // Falls back to SQLite for cold storage. No external dependency.
   const cache = new Map<string, { data: unknown; expiresAt: number }>();

   export function getCached<T>(key: string): T | null {
     const entry = cache.get(key);
     if (!entry) return null;
     if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
     return entry.data as T;
   }

   export function setCached(key: string, data: unknown, ttlMs: number): void {
     cache.set(key, { data, expiresAt: Date.now() + ttlMs });
   }

   export function invalidateCache(keyPrefix: string): void {
     for (const key of cache.keys()) {
       if (key.startsWith(keyPrefix)) cache.delete(key);
     }
   }
   ```

4. **Verify migration:**
   ```bash
   npx prisma studio
   ```
   Confirm all 4 new tables visible with correct columns.

## Todo List
- [ ] Add ShopSettings model to schema.prisma
- [ ] Add ProductCache model to schema.prisma
- [ ] Add SignalAggregate model to schema.prisma
- [ ] Add ActionLog model to schema.prisma
- [ ] Run prisma migrate dev
- [ ] Create db-helpers.server.ts with getShopSettings + isCacheFresh
- [ ] Verify all tables in Prisma Studio
- [ ] Run `npm run typecheck` — no errors

## Success Criteria
- All 4 models created with correct indexes
- Migration applies cleanly
- `getShopSettings("test-shop")` creates default settings row
- TypeScript types generated correctly (Prisma client)

## Risk Assessment
- **SQLite concurrent writes:** Single-writer limitation — acceptable for MVP. If needed, switch to PostgreSQL later (Prisma makes this a config change)
- **Schema evolution:** Adding fields later requires new migrations — plan models to be extensible (JSON strings for flexible data like substitutionProductIds)

## Security Considerations
- No PII stored in new models — productIds and shop domains are public data
- sessionId in ActionLog is anonymous (localStorage-generated UUID), not tied to customer identity
- Shop settings accessible only via authenticated admin routes

## Next Steps
- Phase 05: Agent Guidelines (so feature plan agents know how to use these models)
- Intent Engine plan: Populate SignalAggregate from tracked events
- Admin Dashboard plan: Read/write ShopSettings, query ActionLog for analytics
