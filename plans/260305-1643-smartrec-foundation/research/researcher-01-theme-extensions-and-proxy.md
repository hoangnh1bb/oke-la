# Theme App Extensions & App Proxy Research
**Date:** 2026-03-05 | **Scope:** SmartRec storefront tracker foundation

---

## 1. Theme App Extensions

### Block Types: App Block vs App Embed Block

| | App Block | App Embed Block |
|---|---|---|
| Schema target | `section` | `body`, `head`, `compliance_head` |
| Position in theme | Inside a section, merchant places manually | Injected before `</body>` or `</head>` globally |
| Merchant activation | Added via theme editor > Apps panel | Enabled via theme editor > App embeds panel |
| Dynamic sources (autofill) | Yes | No (only global Liquid scope) |
| Vintage theme support | No (requires JSON templates) | Yes |

**Decision for SmartRec:** Use **App Embed Block** (`target: body`). SmartRec injects a global JS tracker on all pages — no inline UI, no per-section placement needed. Embed blocks are also supported on vintage themes, maximizing merchant reach.

### File Structure

```
extensions/
└── smartrec-theme-extension/
    ├── assets/
    │   └── tracker.js          # the storefront tracker script
    ├── blocks/
    │   └── tracker-embed.liquid # app embed block entry point
    ├── snippets/               # optional reusable Liquid
    ├── locales/                # merchant-facing translations
    ├── package.json
    └── shopify.extension.toml
```

### Generating the Extension

```bash
shopify app generate extension
# Select: Theme app extension
# Provide name: smartrec-theme-extension
```

### Liquid Schema for App Embed Block

```liquid
<!-- blocks/tracker-embed.liquid -->
<script>
  window.SmartRecConfig = {
    appProxy: "{{ shop.permanent_domain | prepend: 'https://' }}/apps/smartrec",
    customerId: {{ customer.id | json }},
    currentTemplate: {{ request.page_type | json }}
  };
</script>
{{ 'tracker.js' | asset_url | script_tag }}

{% schema %}
{
  "name": "SmartRec Tracker",
  "target": "body",
  "settings": [
    {
      "type": "checkbox",
      "id": "track_product_views",
      "label": "Track product views",
      "default": true
    },
    {
      "type": "checkbox",
      "id": "track_collection_views",
      "label": "Track collection views",
      "default": true
    }
  ]
}
{% endschema %}
```

Merchant settings accessed via `block.settings.track_product_views`.

### Accessing Storefront Data in JS

Liquid renders before JS executes. Use Liquid to embed data into the page:

```liquid
<script>
  window.SmartRecMeta = {
    productId: {{ product.id | json }},
    productHandle: {{ product.handle | json }},
    collectionHandle: {{ collection.handle | json }},
    cartToken: {{ cart.token | json }},
    pageType: {{ request.page_type | json }},
    customerId: {{ customer.id | json }}
  };
</script>
```

Available Liquid objects in embed blocks: `shop`, `product`, `collection`, `cart`, `customer`, `request`, `page_type`. Note: NO access to `content_for_header`, `content_for_index`, `content_for_layout`, or parent `section` properties (except `section.id`).

---

## 2. App Proxy

### How It Works

Shopify intercepts requests to `https://<shop>.myshopify.com/apps/<subpath>/*` and forwards them to your app server. No CORS issues — request originates from Shopify's servers to your app, response served from shop domain.

### Configuration in `shopify.app.toml`

```toml
[app_proxy]
url = "/proxy"          # relative path on your app server
prefix = "apps"         # must be: apps | a | community | tools
subpath = "smartrec"    # custom segment, max 30 chars
```

Result: `https://<shop>/apps/smartrec/*` → `https://<app_url>/proxy/*`

### Authentication

Using the React Router template, authentication is one line:

```js
// app/routes/proxy.jsx
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.public.appProxy(request);
  // Shopify adds: ?shop=, &logged_in_customer_id=, &timestamp=, &signature=
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  // ... handle tracker event POST or GET recommendations
};
```

Shopify adds HMAC signature (`signature` param) to every proxied request for verification. The `authenticate.public.appProxy()` call verifies this automatically.

### CORS

Not an issue. The JS on the storefront calls `https://<shop>/apps/smartrec/...` — same origin as the storefront. Shopify proxies that to your app server server-side.

---

## 3. Scopes

| Scope | Required For | Notes |
|---|---|---|
| `write_app_proxy` | App proxy configuration | Required to create the proxy route |
| `read_products` | Reading product data for recommendations | Already in current `shopify.app.toml` |
| `read_orders` | Reading order history for personalization | Already in current `shopify.app.toml` |
| `read_themes` | Deep linking to theme editor, verifying block installation | Already in current `shopify.app.toml` |
| ~~`write_themes`~~ | NOT needed | Theme app extensions don't modify theme files |

Current `shopify.app.toml` already has `read_products,read_orders,read_themes`. Need to **add `write_app_proxy`**.

Theme app extensions do NOT require `write_themes`. Confirmed: they are deployed via `shopify app deploy` and injected by Shopify's platform, not via Asset API.

### Updated Scopes Line

```toml
[access_scopes]
scopes = "read_products,read_orders,read_themes,write_app_proxy"
```

(Remove `write_themes`, `write_content`, `read_content`, `write_products` if unused by SmartRec.)

---

## Key Decisions Summary

1. **App Embed Block** over App Block — global tracker, no inline UI needed
2. **App Proxy** for tracker event ingestion — avoids CORS, Shopify handles auth verification
3. **Liquid data injection** in embed block — passes `productId`, `customerId`, `pageType` to JS via `window.SmartRecMeta`
4. **No `write_themes` scope needed** — theme extensions deploy independently

---

## Unresolved Questions

1. Should the tracker POST events to the app proxy synchronously or use a fire-and-forget `navigator.sendBeacon()`? (Performance impact consideration)
2. App proxy has one route per app — if SmartRec grows beyond tracking (e.g., recommendations endpoint), will sub-paths under `/apps/smartrec/*` suffice?
3. Deep-link activation post-install: should onboarding auto-redirect merchant to enable the embed block, or require manual steps?
