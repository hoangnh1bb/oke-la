---
title: "Widget Renderer — Storefront UI Components"
description: "4 intent-driven UI components injected into Shopify storefront via DOM manipulation"
status: pending
priority: P1
effort: 4-5h
depends_on: plans/260305-1643-smartrec-foundation
branch: main
tags: [smartrec, widget-renderer, storefront, vanilla-js, dom-injection]
created: 2026-03-05
---

# Widget Renderer — Storefront UI Components

## Overview

Feature 3 of SmartRec. The Widget Renderer is the **only thing shoppers see**. It receives action objects from the Intent Engine (via `/apps/smartrec/intent` app proxy) and renders the correct UI component at the correct position on the storefront page.

**4 components to build:**

| # | Component | Trigger | Position | Use Case |
|---|---|---|---|---|
| 1 | `alternative_nudge` | Score 56-75 + hesitation signals | Below product description, above ATC | UC-01: Hesitating Shopper |
| 2 | `comparison_bar` | compare_pattern (≥2 products same type) | Sticky bottom bar (60px) | UC-02: Comparison Shopper |
| 3 | `tag_navigator` | back_nav ≥3 + cart empty | Slide-in panel from right (260px) | UC-03: Lost Shopper |
| 4 | `trust_nudge` | cart_hesitation > 60s | Below cart items, above checkout btn | UC-04: Cart Doubt |

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Shopify Admin API (source of truth)                             │
│  • read_products → title, price, images, tags, product_type     │
│  • read_orders   → substitution patterns (view A → buy B)       │
│  • Store policies → return/refund info                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ server fetches & caches (4h TTL)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Intent Engine (app server — POST /apps/smartrec/intent)         │
│  1. Receives session signals + intent score from storefront     │
│  2. Decides action type based on score + signals                │
│  3. Fetches REAL product data from Shopify Admin API            │
│     - alternative_nudge: query similar products by tags/type    │
│     - comparison_bar: fetch both products being compared        │
│     - tag_navigator: extract tags from viewed product IDs       │
│     - trust_nudge: fetch rating/reviews for cart items          │
│  4. Returns action object with resolved product data            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ JSON response via app proxy
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ signal-collector.js (storefront)                                │
│  evaluateAndAct() → receives action with real store data        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ passes action to renderer
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ widget-renderer.js (storefront) — DUMB RENDERER                 │
│  Chỉ render data nhận được. Không fetch thêm API nào.           │
│  Không có business logic. Không biết data đến từ đâu.           │
│                                                                 │
│  ├── renderAlternativeNudge(data)  → real products from store   │
│  ├── renderComparisonBar(data)     → real products being viewed │
│  ├── renderTagNavigator(data)      → real tags from products    │
│  └── renderTrustNudge(data)        → real ratings & policies    │
└─────────────────────────────────────────────────────────────────┘
```

**QUAN TRỌNG:** Widget Renderer là **dumb renderer** — nó chỉ nhận data đã được resolve sẵn từ server và render UI. Tất cả product data (title, price, image, rating, tags) đều được Intent Engine fetch từ **Shopify Admin API** (`read_products`, `read_orders`) rồi trả về trong action response. Renderer KHÔNG gọi API nào cả.

**File location:** `extensions/smartrec-theme-ext/assets/smartrec-widget-renderer.js`

This replaces the stub created in Foundation Phase 02.

## Data Source: Shopify Admin API

| Data point | Source | API | Cache |
|---|---|---|---|
| Product title, price, images | Shopify store catalog | `admin.graphql` → `products` query | 4h per store |
| Product tags, product_type | Shopify store catalog | `admin.graphql` → `products` query | 4h per store |
| Alternative products | Query by shared tags/type | `admin.graphql` → `products(query: ...)` | 4h per product |
| Rating, review count | Shopify product metafields or Judge.me/Loox API | `admin.graphql` → `product.metafields` | 4h per product |
| Return/refund policy | Shopify store policies | `admin.graphql` → `shop.refundPolicy` | 24h per store |
| Substitution patterns | Order history analysis | `admin.graphql` → `orders` query | Daily rebuild |

### Image URLs
Intent Engine returns **Shopify CDN URLs** with size parameters pre-applied:
```
https://cdn.shopify.com/s/files/{shop}/products/{image}_160x160_crop_center.jpg
```
Widget renderer uses URLs as-is. No image manipulation needed on client.

### Price Formatting
Intent Engine returns **pre-formatted prices** using store's currency:
```
"350.000₫"  (VND)
"$35.00"    (USD)
```
Widget renderer displays as-is. No currency formatting needed on client.

## Dependencies

- **Foundation plan complete:** Theme extension scaffold, app proxy, DB schema
- **Signal Collector:** Must be calling `/apps/smartrec/intent` and passing action to `renderAction()`
- **Intent Engine:** Must fetch real Shopify product data and return resolved action objects

**Can be tested standalone** by calling `SmartRecRender({ type: "...", data: {...} })` from browser console with sample data matching the API contract below. But production data always comes from Shopify store.

## Design Principles (ALL components)

1. **Fade-in 300ms** — opacity transition only. No scale-up, no bounce.
2. **Always dismissable** — X button visible immediately, no scroll needed.
3. **Session persistence** — dismissed state saved to `localStorage`. No re-show in same session.
4. **Zero intrusion** — no modal, no overlay, no content blocking.
5. **Theme-aware CSS** — use CSS variables to inherit store's font family, text color, background color, border radius.
6. **Mobile-first** — test on 375px first. Desktop is secondary.
7. **No checkout** — never inject anything on `/checkout` pages.
8. **Namespace isolation** — all CSS classes prefixed `sr-` to avoid collisions with theme.

## Theme CSS Variable Strategy

```css
.sr-widget {
  font-family: var(--font-body-family, var(--font-family, inherit));
  color: var(--color-foreground, var(--color-base-text, inherit));
  background: var(--color-background, var(--color-base-background-1, #fff));
  border-radius: var(--buttons-radius, 4px);
  --sr-accent: var(--color-button, var(--color-base-accent-1, #000));
}
```

Fallback chain: Dawn v15+ vars → Dawn legacy vars → safe defaults.

## Phases

| # | Phase | Status | Effort | File |
|---|---|---|---|---|
| 01 | Core Framework & Shared Utilities | pending | 1h | [phase-01](./phase-01-core-framework.md) |
| 02 | Alternative Nudge Component | pending | 1h | [phase-02](./phase-02-alternative-nudge.md) |
| 03 | Comparison Bar Component | pending | 1h | [phase-03](./phase-03-comparison-bar.md) |
| 04 | Tag Navigator Component | pending | 0.5h | [phase-04](./phase-04-tag-navigator.md) |
| 05 | Trust Nudge Component | pending | 0.5h | [phase-05](./phase-05-trust-nudge.md) |
| 06 | Mobile Optimization & Polish | pending | 0.5h | [phase-06](./phase-06-mobile-and-polish.md) |

## API Contract (Intent Engine → Widget Renderer)

All data is **fetched from Shopify Admin API** by the Intent Engine server before being sent to the renderer. The renderer is a dumb UI layer — no API calls, no business logic.

```ts
// Action object shape from POST /apps/smartrec/intent
// Server fetches real store data via admin.graphql before returning
type Action =
  | { type: "none" }
  | { type: "alternative_nudge"; data: AlternativeNudgeData }
  | { type: "comparison_bar"; data: ComparisonBarData }
  | { type: "tag_navigator"; data: TagNavigatorData }
  | { type: "trust_nudge"; data: TrustNudgeData };

interface AlternativeNudgeData {
  // Products fetched via: admin.graphql → products(query: "product_type:{type} OR tag:{tags}")
  // Filtered by substitution patterns from order history
  products: Array<{
    id: number;             // Shopify product GID (numeric)
    title: string;          // from Shopify product.title
    handle: string;         // from Shopify product.handle
    price: string;          // pre-formatted with store currency: "350.000₫"
    image_url: string;      // Shopify CDN URL with _160x160_crop_center
    url: string;            // "/products/{handle}" — relative path
  }>;  // max 2 products
}

interface ComparisonBarData {
  // Both products fetched via: admin.graphql → product(id: "gid://shopify/Product/{id}")
  // Product IDs come from session.pageViews (signal-collector tracks viewed products)
  productA: {
    id: number;
    title: string;          // from Shopify
    handle: string;
    price: string;          // pre-formatted
    image_url: string;      // Shopify CDN URL
    rating: number | null;  // from product metafield (Judge.me/Loox) or null
    review_count: number;   // from product metafield or 0
    url: string;
  };
  productB: {               // same shape — current product being viewed
    id: number;
    title: string;
    handle: string;
    price: string;
    image_url: string;
    rating: number | null;
    review_count: number;
    url: string;
  };
  // Server computes diff points by comparing price & rating
  diff_points: string[];    // max 2, e.g. ["Rẻ hơn 50.000₫", "Rating cao hơn 0.3★"]
}

interface TagNavigatorData {
  // Tags extracted from products the shopper viewed in this session
  // Server fetches: admin.graphql → products(ids: [...viewed_ids]) → tags
  // Then counts frequency, returns top 3-4
  tags: Array<{
    label: string;          // display name (from Shopify product tag)
    value: string;          // URL-safe tag value for filter param
    count: number;          // how many viewed products had this tag
  }>;  // 3-4 tags
}

interface TrustNudgeData {
  // Cart items fetched via: admin.graphql → products(ids: [...cart_product_ids])
  // Return policy from: admin.graphql → shop { refundPolicy { body } }
  items: Array<{
    product_id: number;     // Shopify product ID
    title: string;          // from Shopify product.title
    rating: number | null;  // from product metafield or null
    review_count: number;   // from product metafield or 0
    has_free_return: boolean; // derived from shop.refundPolicy
  }>;
}
```

## Acceptance Criteria

| # | Criteria | Test | Priority |
|---|---|---|---|
| W-01 | alternative_nudge renders below product description, above ATC | Inject on product page → visually correct | MUST |
| W-02 | alternative_nudge shows max 2 products with image, title, price, "View" btn | Mock data with 2 products → all fields rendered | MUST |
| W-03 | alternative_nudge fade-in after 3s delay | Trigger → 3s wait → opacity 0→1 in 300ms | MUST |
| W-04 | comparison_bar fixed bottom, 60px height, doesn't cover content | Scroll page → bar stays at bottom | MUST |
| W-05 | comparison_bar "So sánh" button opens slide-up panel | Click → panel slides up with side-by-side | MUST |
| W-06 | tag_navigator slides in from right, 260px wide | Trigger → panel slides in from right edge | MUST |
| W-07 | tag_navigator shows 3-4 tags as clickable buttons | Mock 4 tags → all render as buttons | MUST |
| W-08 | tag click navigates to /collections/all?filter.p.tag=[tag] | Click tag → correct URL navigation | MUST |
| W-09 | trust_nudge shows rating + reviews + return badge per cart item | Mock 2 cart items → trust info rendered | MUST |
| W-10 | All components have visible X button for dismiss | Each component → X visible without scroll | MUST |
| W-11 | Dismiss persists in localStorage, no re-show in session | Dismiss → reload → component doesn't appear | MUST |
| W-12 | All components use 300ms opacity fade-in | Visual inspection on all 4 | MUST |
| W-13 | No widget injected on /checkout pages | Navigate to checkout → no SmartRec DOM | MUST |
| W-14 | CSS inherits theme font and colors | Test on Dawn, test on custom theme | MUST |
| W-15 | All components usable on 375px mobile | Chrome DevTools iPhone SE → no overflow | MUST |
| W-16 | Total JS < 15KB gzipped (shared with signal-collector) | Build → check gzip size | SHOULD |

## Out of Scope

- Custom widget copy / i18n (hardcode Vietnamese for v1)
- Animation beyond opacity fade-in
- Widget position customization by merchant
- A/B testing different widget variants
- Rich product cards (description, variants)

## Unresolved Questions

1. **DOM anchor selectors:** Product description and ATC button selectors vary across themes. Mitigated with ordered fallback list (6+ selectors per anchor). May need to expand after testing on more themes.
2. **Cart page structure:** `/cart` page DOM varies wildly. Trust nudge uses 6 fallback selectors. If none match, graceful degradation (widget doesn't render).
3. ~~**Product image CDN URLs**~~ **RESOLVED:** Intent Engine returns pre-formatted Shopify CDN URLs (`_160x160_crop_center`). Renderer uses URLs as-is. Prices also pre-formatted with store currency.
4. **Review/rating source:** Shopify core doesn't have native reviews. Rating data depends on review apps (Judge.me, Loox) storing data in product metafields. If no review app installed, `rating` will be `null` and `review_count` will be `0`. Trust nudge and comparison bar should handle this gracefully.
