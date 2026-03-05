# Phase 02 — Theme App Extension + Signal Collector

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: [Phase 01](phase-01-foundation-database.md) (Prisma models, types)
- PRD: Sections 2 (Behavioral Signal Model), 4.3 (Signal Collector Script)
- Signal Collector Spec: [signalcollector.md](/Users/bbuser/Documents/oke-la/signalcollector.md)
- Research: [Script Tags Report](reports/researcher-01-script-tags-api.md) — confirms Theme Extensions required

## Overview
- **Priority:** P1
- **Effort:** 2h
- **Status:** pending
- **Description:** Create Shopify Theme App Extension with signal-collector.js and widget-renderer.js as static assets. Signal collector tracks 7 behavioral signals, computes Intent Score client-side (0-100), stores session in localStorage, and communicates with app server via App Proxy.

## Key Insights
- Script Tags are deprecated — Theme App Extensions are mandatory for App Store
- Theme extension = `extensions/smartrec-widget/` directory with Liquid blocks + JS assets
- App Proxy handles CORS: storefront requests go through `https://{shop}.myshopify.com/apps/smartrec/*` → forwarded to app server
- Signal collector must be <15KB gzipped, async, non-blocking (no LCP impact)
- Client-side scoring avoids server round-trip for every signal change
- Re-evaluation triggered 5s after page load + on significant signal changes
- localStorage key `sr_session`, 24h TTL, cap 50 viewed products

## Requirements

### Functional
- F-01: Theme extension with app block for product pages and cart page
- F-02: signal-collector.js tracks: time_on_product, scroll_depth, review_hover, size_chart_open, image_gallery_swipe, back_navigation, cart_hesitation
- F-03: Intent Score calculation (0-100) using PRD Section 2.2 weights
- F-04: localStorage session management with 24h TTL, 50 product cap
- F-05: Communication with server via App Proxy (POST to `/apps/smartrec/api/intent`)
- F-06: Page type detection (product/cart/collection/home)
- F-07: No execution on /checkout pages
- F-08: Dismiss memory — dismissed widgets stored in session, not re-shown

### Non-Functional
- NF-01: Bundle size <15KB gzipped
- NF-02: Zero render-blocking — async script loading
- NF-03: Client-side throttling — max 1 server call per 5 seconds per session
- NF-04: No PII stored — only product IDs, timestamps, anonymous session ID

## Architecture

### Theme Extension Structure
```
extensions/smartrec-widget/
├── blocks/
│   ├── smartrec-product.liquid    # App block for product pages
│   └── smartrec-cart.liquid       # App block for cart pages
├── assets/
│   ├── signal-collector.js        # Core signal tracking + scoring
│   └── widget-renderer.js         # Widget DOM injection (Phase 4)
├── locales/
│   └── en.default.json            # Extension settings labels
└── shopify.extension.toml         # Extension config
```

### Data Flow
```
Storefront (product page)
    ↓
signal-collector.js
    ├── Track signals → update localStorage (sr_session)
    ├── Calculate Intent Score (client-side)
    └── POST /apps/smartrec/api/intent (via App Proxy)
            ↓
        App server (api.proxy.tsx) → validates signature → routes to intent engine
            ↓
        Returns IntentAction { type, data }
            ↓
        widget-renderer.js → injects DOM widget
```

### Signal Collection Methods

| Signal | DOM Target | Method | Frequency |
|--------|-----------|--------|-----------|
| time_on_product | Page | setInterval 10s | Continuous |
| scroll_depth | Window | scroll event (throttled 500ms) | On change |
| review_hover | `.review, [data-reviews], #reviews` | mouseenter + 5s timer | Once per page |
| size_chart_open | `.size-chart, [data-size-chart], [data-size-guide]` | click | Once per page |
| image_gallery_swipe | `.product-gallery, .product__media` | touchstart/click count | Continuous |
| back_navigation | Window | popstate + pagehide + performance.navigation | On trigger |
| cart_hesitation | Cart page | Idle timer >60s without checkout click | Once per page |

### Intent Score Weights (from PRD 2.2)
```javascript
// Real-time signals (reset per product page)
time_on_product > 60s  → +25
time_on_product > 120s → +15 (cumulative with above = 40)
scroll_depth > 70%     → +15
review_hover (5s+)     → +20
size_chart_open        → +25
image_gallery_swipe >3 → +10

// Navigation signals
back_navigation        → -30
compare_pattern        → +20

// Contextual boosts
returning_visitor      → +10
traffic_source_keyword → +15

// Clamp to 0-100
```

## Related Code Files

### Files to Create
- `extensions/smartrec-widget/shopify.extension.toml`
- `extensions/smartrec-widget/blocks/smartrec-product.liquid`
- `extensions/smartrec-widget/blocks/smartrec-cart.liquid`
- `extensions/smartrec-widget/assets/signal-collector.js`
- `extensions/smartrec-widget/assets/widget-renderer.js` (stub — filled in Phase 4)
- `extensions/smartrec-widget/locales/en.default.json`

### Files to Modify
- `shopify.app.toml` — Add `[app_proxy]` config (if not done in Phase 1)

### Files to Delete
- None

## Implementation Steps

### 1. Generate Theme Extension Scaffold

```bash
cd /Users/bbuser/Documents/oke-la
npm run generate extension  # Select "Theme app extension"
# Name: smartrec-widget
```

If manual creation needed, create directory structure above.

### 2. Configure `shopify.extension.toml`

```toml
api_version = "2025-10"

[[extensions]]
type = "theme"
name = "SmartRec Intent Discovery"
handle = "smartrec-widget"

  [[extensions.blocks]]
  template = "blocks/smartrec-product.liquid"
  name = "SmartRec Signal Collector"
  target = "section"

  [[extensions.blocks]]
  template = "blocks/smartrec-cart.liquid"
  name = "SmartRec Cart Monitor"
  target = "section"
```

### 3. Create Product Page Block (`blocks/smartrec-product.liquid`)

```liquid
{% comment %}
  SmartRec Signal Collector — Product Page
  Injects signal-collector.js with product context
{% endcomment %}

<div id="smartrec-root" style="display:none"
  data-shop="{{ shop.permanent_domain }}"
  data-product-id="{{ product.id }}"
  data-product-type="{{ product.type }}"
  data-product-tags="{{ product.tags | join: ',' }}"
  data-product-price="{{ product.price | money_without_currency }}"
  data-product-title="{{ product.title | escape }}"
  data-proxy-base="/apps/smartrec"
  data-page-type="product">
</div>

{{ 'signal-collector.js' | asset_url | script_tag }}

{% schema %}
{
  "name": "SmartRec Signal Collector",
  "target": "section",
  "enabled_on": {
    "templates": ["product"]
  },
  "settings": []
}
{% endschema %}
```

### 4. Create Cart Page Block (`blocks/smartrec-cart.liquid`)

```liquid
<div id="smartrec-root" style="display:none"
  data-shop="{{ shop.permanent_domain }}"
  data-proxy-base="/apps/smartrec"
  data-page-type="cart">
</div>

{{ 'signal-collector.js' | asset_url | script_tag }}

{% schema %}
{
  "name": "SmartRec Cart Monitor",
  "target": "section",
  "enabled_on": {
    "templates": ["cart"]
  },
  "settings": []
}
{% endschema %}
```

### 5. Build `signal-collector.js`

Core structure (vanilla JS, IIFE, <15KB):

```javascript
(function SmartRecSignals() {
  "use strict";

  // ── Constants ──
  const SESSION_KEY = "sr_session";
  const SESSION_TTL = 24 * 60 * 60 * 1000; // 24h
  const MAX_VIEWED = 50;
  const THROTTLE_MS = 5000; // Min 5s between server calls
  const EVAL_DELAY = 5000;  // 5s after page load before first eval

  // ── Root element & config ──
  const root = document.getElementById("smartrec-root");
  if (!root) return;

  const config = {
    shop: root.dataset.shop,
    productId: root.dataset.productId,
    productType: root.dataset.productType,
    productTags: (root.dataset.productTags || "").split(",").filter(Boolean),
    productPrice: root.dataset.productPrice,
    productTitle: root.dataset.productTitle,
    proxyBase: root.dataset.proxyBase,
    pageType: root.dataset.pageType,
  };

  // ── Checkout guard ──
  if (window.location.pathname.startsWith("/checkout")) return;

  // ── Session management ──
  function loadSession() { /* load from localStorage, check TTL, init if expired/missing */ }
  function saveSession() { /* save to localStorage */ }
  function addViewedProduct(id) { /* push to viewedProducts, cap at MAX_VIEWED */ }

  // ── Signal tracking functions ──
  function trackTimeOnPage() { /* setInterval 10s, increment session.signals.timeOnProduct */ }
  function trackScrollDepth() { /* throttled scroll listener, update max scroll % */ }
  function trackReviewHover() { /* mouseenter on review selectors, 5s timer for confirmation */ }
  function trackSizeChartOpen() { /* click listener on size chart selectors */ }
  function trackImageGallery() { /* count touch/click on gallery elements */ }
  function trackBackNavigation() { /* popstate + pagehide listeners */ }
  function trackCartHesitation() { /* idle timer on cart page, reset on any click */ }
  function detectComparePattern() { /* check viewedProducts for ≥2 same productType in session */ }
  function detectReturningVisitor() { /* check session.visitCount > 1 */ }

  // ── Intent Score ──
  function calculateIntentScore(signals) {
    let score = 0;
    if (signals.timeOnProduct > 60) score += 25;
    if (signals.timeOnProduct > 120) score += 15;
    if (signals.scrollDepth > 70) score += 15;
    if (signals.reviewHover) score += 20;
    if (signals.sizeChartOpen) score += 25;
    if (signals.imageGallerySwipes > 3) score += 10;
    if (signals.backNavigation) score -= 30;
    if (signals.comparePattern) score += 20;
    if (signals.returningVisitor) score += 10;
    if (signals.trafficSourceKeyword) score += 15;
    return Math.min(Math.max(score, 0), 100);
  }

  // ── Server communication (via App Proxy) ──
  let lastCallTime = 0;
  async function evaluateAndAct() {
    const now = Date.now();
    if (now - lastCallTime < THROTTLE_MS) return;
    lastCallTime = now;

    const score = calculateIntentScore(session.signals);
    if (score < 30) return; // No action for browsing/exploring

    const payload = { sessionId, shop, score, pageType, signals, viewedProducts, cartItems };
    const res = await fetch(`${config.proxyBase}/api/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const action = await res.json();

    if (action.type !== "none" && !isDismissed(action.type)) {
      window.SmartRecRender?.(action); // Calls widget-renderer.js
    }
  }

  // ── Dismiss tracking ──
  function isDismissed(widgetType) { /* check session.dismissed includes widgetType */ }
  function dismiss(widgetType) { /* add to session.dismissed, save */ }

  // ── Initialize ──
  const session = loadSession();
  if (config.pageType === "product") {
    addViewedProduct(config.productId);
    trackTimeOnPage();
    trackScrollDepth();
    trackReviewHover();
    trackSizeChartOpen();
    trackImageGallery();
    trackBackNavigation();
    detectComparePattern();
  }
  if (config.pageType === "cart") {
    trackCartHesitation();
  }

  setTimeout(evaluateAndAct, EVAL_DELAY);
  // Re-evaluate on significant signal changes (size_chart_open, review_hover confirmed, back_nav)
  window.SmartRecEvaluate = evaluateAndAct;
  window.SmartRecDismiss = dismiss;

  saveSession();
})();
```

### 6. Create Widget Renderer Stub

```javascript
// widget-renderer.js — Stub for Phase 4
// Will be populated with DOM injection logic for 4 widget types
(function SmartRecRenderer() {
  "use strict";
  window.SmartRecRender = function(action) {
    console.log("[SmartRec] Action received:", action.type, action.data);
    // Phase 4 implements actual widget rendering
  };
})();
```

### 7. Create Locale File (`locales/en.default.json`)

```json
{
  "name": "SmartRec Intent Discovery",
  "description": "Behavioral intent detection for smarter product discovery"
}
```

### 8. Configure App Proxy in `shopify.app.toml`

Add to existing toml:
```toml
[app_proxy]
url = "https://<app-url>/api/proxy"
subpath = "smartrec"
prefix = "apps"
```

### 9. Verify Extension

```bash
cd /Users/bbuser/Documents/oke-la
npm run dev  # Shopify CLI should detect and serve the theme extension
```

## Todo List
- [ ] Create extensions/smartrec-widget/ directory structure
- [ ] Write shopify.extension.toml
- [ ] Create smartrec-product.liquid block with product data attributes
- [ ] Create smartrec-cart.liquid block
- [ ] Implement signal-collector.js with all 7 signal trackers
- [ ] Implement calculateIntentScore() with PRD weights
- [ ] Implement localStorage session management (load/save/TTL/cap)
- [ ] Implement App Proxy communication with throttling
- [ ] Create widget-renderer.js stub
- [ ] Create en.default.json locale
- [ ] Add app proxy config to shopify.app.toml
- [ ] Verify extension loads in dev store theme editor
- [ ] Test signal collection in browser console

## Success Criteria
- Theme extension appears in store's theme editor as installable block
- Signal collector fires on product pages, logs signals to localStorage
- Intent Score computes correctly per PRD weights (manual test: open size chart → score >= 25)
- POST to App Proxy endpoint succeeds (200 response, no CORS errors)
- Cart hesitation detects >60s idle on cart page
- Script does not execute on /checkout
- Bundle size <15KB gzipped (`gzip -c signal-collector.js | wc -c`)

## Risk Assessment
- **Theme compatibility:** App blocks need merchant to add them in theme editor. Unlike Script Tags, not auto-injected. Mitigation: clear onboarding instructions in admin dashboard (Phase 5).
- **Selector fragility:** Review/size-chart selectors vary across themes. Mitigation: use multiple selectors (class + data-attribute), graceful fallback if none found.
- **App Proxy latency:** Requests route through Shopify infrastructure, adding ~100-200ms. Mitigation: acceptable for intent evaluation (not real-time critical); first eval delayed 5s anyway.
- **localStorage quota:** Extremely unlikely to hit 5MB limit with 50 products. Non-issue.

## Security Considerations
- No PII in localStorage — only product IDs, timestamps, anonymous UUID
- App Proxy requests include Shopify HMAC signature — validated server-side in Phase 3
- No cross-origin requests from storefront (App Proxy same-origin)
- No customer ID tracking unless customer opts in (future v1.1)

## Next Steps
- Phase 3 creates server-side `api.proxy.tsx` route to handle incoming App Proxy requests
- Phase 4 fills in `widget-renderer.js` with actual DOM injection for 4 widget types
- Phase 5 provides admin UI for merchants to install/configure the extension
