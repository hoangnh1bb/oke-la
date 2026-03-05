# Phase 05 — Agent Guidelines & Future Feature Plans

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: All previous phases (this is the final foundation phase)
- PRD: [PRD.0.1.md](../../PRD.0.1.md) — full MVP spec
- PRD: [PRD.md](../../PRD.md) — PMF research

## Overview
- **Priority:** P1 — Agents need these rules before building features
- **Status:** pending
- **Description:** Document architectural rules, coding conventions, API contracts, and boundaries that all future feature-building agents must follow. Define scope of each future feature plan.

## Key Insights
- SmartRec has 3 execution contexts: Admin (server + React), Proxy API (server), Storefront (vanilla JS in theme extension)
- Storefront JS cannot use React, npm packages, or import statements — must be self-contained vanilla JS
- All storefront↔server communication goes through app proxy (same-origin)
- Intent-first philosophy: score 90+ = NO recommendation. This is counter-intuitive — agents must not "optimize" by always showing widgets

---

## Agent Rules & Principles

### Rule 1: Three Execution Contexts

| Context | Location | Tech | Access |
|---|---|---|---|
| **Admin** | `app/routes/app.*.tsx` | React Router + Polaris web components | Full server, Prisma, Shopify Admin API |
| **Proxy API** | `app/routes/proxy.$.tsx` + `app/lib/` | Server-only TypeScript | Prisma, Shopify Admin API, no React |
| **Storefront** | `extensions/smartrec-theme-ext/assets/` | Vanilla JS (no bundler) | localStorage, DOM, fetch to app proxy only |

**NEVER** mix contexts:
- No React imports in storefront JS
- No DOM manipulation in server code
- No direct Shopify Admin API calls from storefront JS

### Rule 2: Storefront JS Constraints

- **No npm packages.** No import/require. Single IIFE per file.
- **No bundler.** Files in `extensions/*/assets/` are served as-is from CDN.
- **Size budget:** signal-collector.js < 10KB, widget-renderer.js < 10KB (uncompressed)
- **No eval, no Function constructor.** Shopify CSP blocks these.
- **Data source:** `window.SmartRecMeta` (injected by Liquid) + localStorage + fetch to app proxy
- **Async only:** Use `navigator.sendBeacon()` for fire-and-forget tracking. Use `fetch()` with timeout for intent evaluation.

### Rule 3: App Proxy API Contracts

All endpoints under `/apps/smartrec/` (proxied to `/proxy/`):

**POST /track**
```json
// Request
{ "event": "time_on_product", "productId": "123", "value": 65, "sessionId": "uuid" }
// Response
{ "ok": true }
```

**POST /intent**
```json
// Request
{ "session": { "pageViews": [...], "backNavCount": 2, ... }, "score": 62, "pageType": "product", "productId": "123" }
// Response
{ "type": "alternative_nudge", "data": { "products": [...] } }
// OR
{ "type": "none", "data": null }
```

**GET /products?productId=123&shop=x.myshopify.com**
```json
// Response
{ "products": [{ "id": "456", "title": "...", "price": 29.99, "imageUrl": "...", "handle": "..." }] }
```

**GET /config?shop=x.myshopify.com**
```json
// Response
{ "enabled": true, "thresholds": { "browsing": 30, "considering": 55, "highConsideration": 75, "strongIntent": 89 }, "widgets": { "alternative_nudge": true, ... } }
```

### Rule 4: Intent-First Philosophy (CRITICAL)

From PRD — this is the core differentiator:

- **Score 0–30:** Do NOTHING. Shopper just arrived.
- **Score 31–55:** Quiet sidebar suggestion only.
- **Score 56–75:** Show 2 alternatives (NOT upsells, NOT higher-priced items).
- **Score 76–89:** Social proof + alternative.
- **Score 90–100:** Do NOTHING. Shopper already decided — don't distract!
- **back_nav trigger:** Show recovery message on NEXT page, not current.

**Agents MUST NOT:**
- Add "always show" logic or override score thresholds
- Recommend higher-priced items (this is NOT upsell)
- Add modals, overlays, or popups
- Add countdown timers, scarcity tactics, or pressure copy
- Show widgets on /checkout pages

### Rule 5: File Naming & Organization

- Server lib files: `app/lib/{feature-name}.server.ts` (kebab-case, `.server.ts` suffix)
- Route files follow React Router flat convention: `app/routes/app.{page}.tsx`, `app/routes/proxy.$.tsx`
- Storefront JS: `extensions/smartrec-theme-ext/assets/smartrec-{name}.js`
- Tests: alongside source file or in `__tests__/` directory

### Rule 6: Database Access Patterns

- Use `prisma` client from `app/db.server.ts` — already configured
- `getShopSettings(shop)` — upserts with defaults, safe to call repeatedly
- `ProductCache` — always check `isCacheFresh(cachedAt)` before returning; refetch from Admin API if stale (4h TTL)
- `SignalAggregate` — upsert pattern: increment counters, don't replace
- `ActionLog` — append-only, query with date range for analytics

### Rule 7: Shopify API Usage

- Always use `authenticate.admin(request)` in admin routes
- Always use `authenticate.public.appProxy(request)` in proxy routes
- GraphQL via `admin.graphql()` from authenticated session
- For proxy routes needing Admin API: create offline session using shop domain from proxy params
- Product queries: batch where possible, use `first: 50` pagination

---

## Future Feature Plans (Scope Definitions)

### Plan: Signal Collector
**Scope:** Replace `smartrec-signal-collector.js` stub with real implementation.
- Track all 8 signals: time_on_product, scroll_depth, review_hover, size_chart_open, image_gallery_swipe, back_navigation, compare_pattern, cart_hesitation
- Calculate intent score client-side (0–100)
- Store session in localStorage
- POST signals to /apps/smartrec/track via sendBeacon
- Re-evaluate on significant signal changes (debounced)
- **Files:** `extensions/smartrec-theme-ext/assets/smartrec-signal-collector.js`
- **No server changes** (uses existing track endpoint)

### Plan: Intent Engine
**Scope:** Replace proxy handler stubs with real score→action logic.
- Receive session + score from storefront
- Apply use case rules (UC-01 through UC-05)
- Fetch alternative products via Admin API + substitution patterns
- Build and maintain substitution map from order history
- Product cache management (4h TTL)
- **Files:** `app/lib/intent-engine.server.ts`, `app/lib/product-recommendations.server.ts`, `app/lib/substitution-map.server.ts`, update `app/lib/proxy-handlers.server.ts`

### Plan: Widget Renderer
**Scope:** Replace `smartrec-widget-renderer.js` stub with 4 UI components.
- alternative_nudge (inline, 2 product cards)
- comparison_bar (sticky bottom strip)
- tag_navigator (slide-in panel from right)
- trust_nudge (inline under cart items)
- All: fade-in 300ms, dismissable, theme-aware CSS vars, mobile-first
- Calls /apps/smartrec/intent, renders response
- **Files:** `extensions/smartrec-theme-ext/assets/smartrec-widget-renderer.js`
- **No server changes** (uses existing intent/products endpoints)

### Plan: Admin Dashboard
**Scope:** Merchant settings page + basic analytics.
- Settings: enable/disable widgets, adjust score thresholds
- Analytics: actions triggered, click-through rates, conversion tracking
- Built with Polaris web components (s-page, s-card, etc.)
- **Files:** `app/routes/app._index.tsx` (update), `app/routes/app.settings.tsx` (create), `app/routes/app.analytics.tsx` (create)

### Plan: MCP Integration (Future v1.1)
**Scope:** Use Shopify MCP `search_shop_catalog` for semantic product matching.
- Integrate existing MCP client pattern from `app/ai-assistant/services/mcp-client.ts`
- Fix `@pfserver/` import paths to local paths
- Use for conversational/intent-driven product queries as alternative to tag-based matching
- **Deferred:** Not needed for MVP. Tag-based + substitution-based recommendations sufficient.

---

## Implementation Steps

1. **Create agent guidelines doc** at project root or docs/:
   - Extract Rules 1–7 into a concise reference document
   - Include API contracts, file naming, execution context table

2. **Update CLAUDE.md** with SmartRec-specific architecture section:
   - Three execution contexts
   - App proxy pattern
   - Theme extension structure

3. **Verify all foundation phases complete** before starting feature plans

## Todo List
- [ ] Write agent guidelines (this document serves as the reference)
- [ ] Update CLAUDE.md with SmartRec architecture additions
- [ ] Verify all Phase 01–04 completed and working
- [ ] Create feature plan stubs (signal-collector, intent-engine, widgets, admin-dashboard)

## Success Criteria
- Agent building Signal Collector can read guidelines and know exactly what JS constraints apply
- Agent building Intent Engine can read API contracts and implement matching request/response shapes
- Agent building Widgets can read philosophy rules and never add modals or pressure tactics
- All agents know which files they own and which they must not modify

## Risk Assessment
- **Guideline drift:** As feature plans evolve, guidelines may need updating — review after each feature plan completion
- **Context size:** Guidelines are long — keep CLAUDE.md additions concise, link to this doc for details

## Security Considerations
- Agent guidelines enforce auth checks on all routes
- No PII collection without explicit consent
- Storefront JS must not expose access tokens or admin endpoints

## Next Steps
- Begin feature plans in priority order: Signal Collector → Intent Engine → Widget Renderer → Admin Dashboard
- MCP Integration deferred to v1.1
