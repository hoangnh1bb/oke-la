# Phase 4: Preview Script (smartrec-preview.js)

**Est: 45 min**

---

## Goal

A lightweight vanilla JS script (< 8KB) injected into the merchant's storefront **temporarily** during onboarding Step 2. It:

1. Listens for `postMessage` from the parent admin app
2. Fetches the 4 demo products from our API (real store products)
3. Renders the requested widget into the page DOM

This script is served from `public/smartrec-preview.js` at `{APP_URL}/smartrec-preview.js`.

---

## Security: Origin Validation

The preview script must validate that messages come from a trusted origin (our app URL).
In development this is the Shopify CLI tunnel URL, in production it's the deployed app URL.

```js
// The script stores the trusted origin as a data attribute on itself
// <script src="...smartrec-preview.js" data-app-origin="https://our-app.fly.dev">
const scriptEl = document.currentScript;
const TRUSTED_ORIGIN = scriptEl?.dataset?.appOrigin || '*'; // fallback for dev
```

When injecting via `scriptTagCreate`, use `displayScope: "ONLINE_STORE"` and pass app URL as data attribute via URL hash or query param.

---

## Full Script Structure

```js
// public/smartrec-preview.js
(function SmartRecPreview() {
  'use strict';

  const SCRIPT_ID = 'smartrec-preview';
  const WIDGET_CONTAINER_CLASS = 'sr-preview-widget';

  // ── Products cache ────────────────────────────────────
  let demoProducts = null;

  async function fetchDemoProducts() {
    if (demoProducts) return demoProducts;
    try {
      const shop = window.Shopify?.shop || window.location.hostname;
      const resp = await fetch(
        `https://${shop}/apps/smartrec/api/demo-products`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (resp.ok) {
        demoProducts = await resp.json();
      }
    } catch (_) {
      demoProducts = getFallbackProducts();
    }
    return demoProducts;
  }

  function getFallbackProducts() {
    return [
      { title: 'Demo Product 1', price: '29.99', image: null },
      { title: 'Demo Product 2', price: '39.99', image: null },
    ];
  }

  // ── Widget renderers ──────────────────────────────────

  function renderAlternativeNudge(products) {
    removeExistingWidgets();
    const container = document.createElement('div');
    container.className = WIDGET_CONTAINER_CLASS;
    container.innerHTML = `
      <div class="sr-widget sr-alternative-nudge">
        <div class="sr-widget-header">
          <span>Không chắc chắn? Khách hàng tương tự cũng xem:</span>
          <button class="sr-dismiss" onclick="this.closest('.sr-preview-widget').remove()">×</button>
        </div>
        <div class="sr-product-list">
          ${products.slice(0, 2).map(p => `
            <div class="sr-product-card">
              ${p.image ? `<img src="${p.image}" alt="${p.title}" width="80" height="80">` : '<div class="sr-img-placeholder"></div>'}
              <div class="sr-product-info">
                <div class="sr-product-title">${p.title}</div>
                <div class="sr-product-price">$${p.price}</div>
                <button class="sr-view-btn">Xem</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="sr-preview-badge">✨ Preview Mode</div>
      </div>
    `;
    injectStyles();

    // Insert below product description, before add-to-cart
    const addToCart = document.querySelector('[name="add"], .product-form__submit, .btn--add-to-cart');
    if (addToCart) {
      addToCart.parentElement?.insertBefore(container, addToCart);
    } else {
      document.body.appendChild(container);
    }
  }

  function renderComparisonBar(products) {
    removeExistingWidgets();
    const p = products[0];
    if (!p) return;
    const bar = document.createElement('div');
    bar.className = `${WIDGET_CONTAINER_CLASS} sr-comparison-bar-wrapper`;
    bar.innerHTML = `
      <div class="sr-widget sr-comparison-bar">
        <span>Bạn cũng đang xem:</span>
        ${p.image ? `<img src="${p.image}" alt="${p.title}" width="40" height="40">` : ''}
        <span>${p.title}</span>
        <span class="sr-price-diff">$${p.price}</span>
        <button class="sr-compare-btn">So sánh</button>
        <button class="sr-dismiss" onclick="this.closest('.sr-comparison-bar-wrapper').remove()">×</button>
        <div class="sr-preview-badge">✨ Preview</div>
      </div>
    `;
    injectStyles();
    document.body.appendChild(bar);
  }

  function renderTagNavigator() {
    removeExistingWidgets();
    const panel = document.createElement('div');
    panel.className = `${WIDGET_CONTAINER_CLASS} sr-tag-nav-wrapper`;
    panel.innerHTML = `
      <div class="sr-widget sr-tag-navigator">
        <button class="sr-dismiss" onclick="this.closest('.sr-tag-nav-wrapper').remove()">×</button>
        <div class="sr-tag-nav-title">Vẫn đang tìm? Thử lọc theo:</div>
        <div class="sr-tag-list">
          <button class="sr-tag">áo thun</button>
          <button class="sr-tag">size M</button>
          <button class="sr-tag">màu đen</button>
        </div>
        <div class="sr-preview-badge">✨ Preview</div>
      </div>
    `;
    injectStyles();
    document.body.appendChild(panel);
  }

  function renderTrustNudge(products) {
    removeExistingWidgets();
    const nudge = document.createElement('div');
    nudge.className = `${WIDGET_CONTAINER_CLASS}`;
    nudge.innerHTML = `
      <div class="sr-widget sr-trust-nudge">
        <div class="sr-trust-item">
          <span class="sr-stars">★★★★★</span>
          <span>${products[0]?.title || 'Sản phẩm'} — 4.8★ từ 234 đánh giá</span>
        </div>
        <div class="sr-trust-item">
          <span>↩</span>
          <span>Đổi trả miễn phí trong 30 ngày</span>
        </div>
        <div class="sr-preview-badge">✨ Preview</div>
      </div>
    `;
    injectStyles();
    // Insert in cart - below cart items
    const cartItems = document.querySelector('.cart-items, .cart__items, form[action="/cart"]');
    if (cartItems) {
      cartItems.after(nudge);
    } else {
      document.body.appendChild(nudge);
    }
  }

  // ── Styles (injected once) ────────────────────────────
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .sr-widget { background: #fff; border: 1px solid #e1e3e5; border-radius: 8px; padding: 16px; font-family: inherit; max-width: 600px; position: relative; }
      .sr-widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 500; }
      .sr-dismiss { background: none; border: none; cursor: pointer; font-size: 18px; color: #666; }
      .sr-product-list { display: flex; gap: 12px; }
      .sr-product-card { display: flex; gap: 8px; border: 1px solid #f0f0f0; border-radius: 6px; padding: 8px; }
      .sr-img-placeholder { width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; }
      .sr-product-title { font-size: 13px; font-weight: 500; }
      .sr-product-price { font-size: 13px; color: #333; }
      .sr-view-btn { margin-top: 4px; padding: 4px 12px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
      .sr-comparison-bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 0; border-left: none; border-right: none; }
      .sr-comparison-bar-wrapper { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; }
      .sr-compare-btn { padding: 6px 14px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
      .sr-tag-nav-wrapper { position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 9999; max-width: 260px; }
      .sr-tag-nav-title { font-weight: 500; margin-bottom: 10px; }
      .sr-tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
      .sr-tag { padding: 6px 12px; border: 1px solid #000; border-radius: 20px; background: none; cursor: pointer; font-size: 13px; }
      .sr-trust-nudge { background: #f6f6f7; border: none; border-top: 1px solid #e1e3e5; border-radius: 0; padding: 12px 16px; }
      .sr-trust-item { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; font-size: 14px; }
      .sr-stars { color: #f4b400; }
      .sr-preview-badge { position: absolute; top: 4px; right: 36px; font-size: 10px; background: #5c6ac4; color: #fff; padding: 2px 6px; border-radius: 4px; }
      .sr-preview-widget + .sr-preview-widget { margin-top: 8px; }
    `;
    document.head.appendChild(style);
  }

  function removeExistingWidgets() {
    document.querySelectorAll(`.${WIDGET_CONTAINER_CLASS}`).forEach(el => el.remove());
  }

  // ── Message listener ──────────────────────────────────
  window.addEventListener('message', async (event) => {
    // Validate message type
    if (!event.data || event.data.type !== 'smartrec_preview_signal') return;

    const { widget } = event.data;
    const products = await fetchDemoProducts();

    switch (widget) {
      case 'alternative_nudge': renderAlternativeNudge(products); break;
      case 'comparison_bar':    renderComparisonBar(products); break;
      case 'tag_navigator':     renderTagNavigator(); break;
      case 'trust_nudge':       renderTrustNudge(products); break;
    }
  });

})();
```

---

## Demo Products API Endpoint

**File**: `app/routes/api.demo-products.tsx`

Publicly accessible (no auth) endpoint for the preview script to fetch real store products.

```ts
// app/routes/api.demo-products.tsx
import type { LoaderFunctionArgs } from "react-router";
import { json } from "react-router";
// Uses unauthenticated access — storefront products are public data
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // The preview script calls this from storefront context
  // We need the shop domain from query params
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) return json({ products: [] });

  // Use unauthenticated.storefront or a cached product list
  // Simpler: return hardcoded demo structure, real products loaded by admin
  // See Phase 5 for product fetching strategy
  return json({ products: [] });
};
```

**Alternative strategy** (preferred): The admin app fetches products in Step 2's loader, passes them to the frontend via `useLoaderData`. The frontend sends the product data *inside* the `postMessage` payload — no separate fetch needed in the preview script.

```ts
// postMessage payload includes product data
iframeRef.contentWindow.postMessage({
  type: 'smartrec_preview_signal',
  widget: 'alternative_nudge',
  products: loaderData.demoProducts, // passed from admin loader
}, storeOrigin);
```

This eliminates the cross-origin API call complexity. **Use this approach.**

Update preview script accordingly — use `event.data.products` directly:

```js
case 'alternative_nudge':
  renderAlternativeNudge(event.data.products || getFallbackProducts());
  break;
```

---

## Acceptance Criteria

- [ ] Script loads on storefront without console errors
- [ ] `postMessage` with `type: 'smartrec_preview_signal'` and `widget: 'alternative_nudge'` renders the nudge widget
- [ ] Each of the 4 widgets renders correctly
- [ ] Dismiss button removes the widget
- [ ] "Preview Mode" badge visible on all widgets (clearly not production)
- [ ] Script size < 8KB minified
- [ ] No render-blocking (async script injection)
