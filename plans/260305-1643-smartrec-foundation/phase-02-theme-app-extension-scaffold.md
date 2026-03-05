# Phase 02 — Theme App Extension Scaffold

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-app-config-and-permissions.md)
- Research: [Theme Extensions & Proxy](./research/researcher-01-theme-extensions-and-proxy.md)
- PRD Section 4.3: Signal Collector Script structure

## Overview
- **Priority:** P1 — Core delivery mechanism for storefront JS
- **Status:** pending
- **Description:** Generate theme app extension, create app embed block that injects signal-collector.js and widget-renderer.js into storefront. Liquid template passes storefront context (productId, pageType, cart) to JS via window globals.

## Key Insights
- **App Embed Block** (target: body), NOT App Block — SmartRec needs global JS on every page, not per-section placement
- Embed blocks work on vintage themes too — maximizes merchant reach
- Assets in `extensions/*/assets/` auto-served from Shopify CDN — no hosting needed
- Liquid renders before JS executes — use Liquid to inject `window.SmartRecMeta` with page context
- Merchant enables via Theme Editor > App embeds panel (toggle on/off)

## Requirements

### Functional
- Theme extension generated via Shopify CLI
- App embed block injects two JS files: signal-collector.js, widget-renderer.js
- Liquid passes: productId, productHandle, collectionHandle, cartToken, pageType, customerId, shopDomain
- App proxy URL injected so JS knows where to POST signals
- Merchant settings: toggle tracking on/off per page type

### Non-functional
- JS files are placeholder stubs in this phase (real logic in separate plans)
- Combined JS < 15KB gzipped target (enforced in future plans)
- Non-blocking: async script loading, zero impact on LCP

## Architecture

```
extensions/smartrec-theme-ext/
├── assets/
│   ├── smartrec-signal-collector.js    # Stub: console.log("collector loaded")
│   └── smartrec-widget-renderer.js     # Stub: console.log("renderer loaded")
├── blocks/
│   └── smartrec-embed.liquid           # App embed block (target: body)
├── locales/
│   └── en.default.json                 # English labels for settings
├── package.json
└── shopify.extension.toml
```

## Related Code Files
- **Create:** `extensions/smartrec-theme-ext/` — entire extension directory
- **Create:** `extensions/smartrec-theme-ext/blocks/smartrec-embed.liquid` — embed block
- **Create:** `extensions/smartrec-theme-ext/assets/smartrec-signal-collector.js` — JS stub
- **Create:** `extensions/smartrec-theme-ext/assets/smartrec-widget-renderer.js` — JS stub
- **Create:** `extensions/smartrec-theme-ext/shopify.extension.toml` — extension config
- **Create:** `extensions/smartrec-theme-ext/locales/en.default.json` — settings labels

## Implementation Steps

1. **Generate extension scaffold:**
   ```bash
   shopify app generate extension --type theme_app_extension --name smartrec-theme-ext
   ```
   If CLI prompts fail, create manually following the file structure above.

2. **Configure `shopify.extension.toml`:**
   ```toml
   api_version = "2025-10"

   [[extensions]]
   type = "theme"
   name = "SmartRec Tracker"
   handle = "smartrec-theme-ext"
   ```

3. **Create `blocks/smartrec-embed.liquid`:**
   ```liquid
   <!-- SmartRec: inject storefront context + load scripts -->
   <script>
     window.SmartRecMeta = {
       shopDomain: {{ shop.permanent_domain | json }},
       appProxy: {{ shop.permanent_domain | prepend: "https://" | append: "/apps/smartrec" | json }},
       pageType: {{ request.page_type | json }},
       productId: {{ product.id | default: "null" | json }},
       productHandle: {{ product.handle | default: "" | json }},
       productType: {{ product.type | default: "" | json }},
       productTags: {{ product.tags | json }},
       productPrice: {{ product.price | default: 0 | json }},
       collectionHandle: {{ collection.handle | default: "" | json }},
       cartToken: {{ cart.token | default: "" | json }},
       cartItemCount: {{ cart.item_count | default: 0 | json }},
       customerId: {{ customer.id | default: "null" | json }},
       templateName: {{ template.name | default: "" | json }},
       enableTracking: {{ block.settings.enable_tracking | json }}
     };
   </script>
   {{ 'smartrec-signal-collector.js' | asset_url | script_tag }}
   {{ 'smartrec-widget-renderer.js' | asset_url | script_tag }}

   {% schema %}
   {
     "name": "SmartRec Tracker",
     "target": "body",
     "settings": [
       {
         "type": "checkbox",
         "id": "enable_tracking",
         "label": "Enable behavior tracking",
         "default": true
       }
     ]
   }
   {% endschema %}
   ```

4. **Create JS stubs in `assets/`:**

   `smartrec-signal-collector.js`:
   ```js
   // SmartRec Signal Collector — stub
   // Real implementation in separate plan
   (function() {
     if (!window.SmartRecMeta || !window.SmartRecMeta.enableTracking) return;
     console.log('[SmartRec] Signal collector loaded', window.SmartRecMeta.pageType);
   })();
   ```

   `smartrec-widget-renderer.js`:
   ```js
   // SmartRec Widget Renderer — stub
   // Real implementation in separate plan
   (function() {
     if (!window.SmartRecMeta) return;
     console.log('[SmartRec] Widget renderer loaded');
   })();
   ```

5. **Create `locales/en.default.json`:**
   ```json
   {
     "name": "SmartRec",
     "settings": {
       "enable_tracking": "Enable behavior tracking"
     }
   }
   ```

6. **Test deployment:**
   ```bash
   shopify app dev
   ```
   - Go to dev store Theme Editor > App embeds
   - Enable "SmartRec Tracker"
   - Visit storefront, check browser console for "[SmartRec]" logs

## Todo List
- [ ] Generate theme extension via CLI (or create manually)
- [ ] Configure shopify.extension.toml
- [ ] Create smartrec-embed.liquid with Liquid context injection
- [ ] Create signal-collector.js stub
- [ ] Create widget-renderer.js stub
- [ ] Create locales/en.default.json
- [ ] Deploy and verify embed block appears in Theme Editor
- [ ] Verify console logs on storefront pages

## Success Criteria
- Extension visible in Theme Editor > App embeds
- Toggling embed on/off works
- Console shows "[SmartRec] Signal collector loaded" + correct pageType on storefront
- `window.SmartRecMeta` contains correct productId on product pages, null on non-product pages

## Risk Assessment
- **Liquid variables null on non-product pages:** Handled with `| default:` filters — productId will be "null" string on collection/home pages
- **Vintage themes:** App embed blocks (target: body) supported on all themes including vintage

## Security Considerations
- No sensitive data in window.SmartRecMeta — only public product/shop info
- customerId only available if customer is logged in (Shopify handles this)
- JS stubs have no network calls yet — no data leakage risk in this phase

## Next Steps
- Phase 03: App Proxy routes (so JS stubs have an endpoint to call)
- Signal Collector plan: Replace JS stub with real tracking logic
