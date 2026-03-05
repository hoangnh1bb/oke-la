# Phase 01 — App Config & Permissions

## Context Links
- Parent: [plan.md](./plan.md)
- PRD: [PRD.0.1.md](../../PRD.0.1.md)
- Research: [Theme Extensions & Proxy](./research/researcher-01-theme-extensions-and-proxy.md)

## Overview
- **Priority:** P1 — Must complete first, all other phases depend on this
- **Status:** pending
- **Description:** Update shopify.app.toml scopes, webhook API version, add app proxy config, clean unused scopes, add orders/create webhook

## Key Insights
- Current scopes include write_products, write_content, write_themes — keep them (app may have other features beyond SmartRec)
- Webhook API version is `2023-07` but server uses `ApiVersion.October25` — must align
- App proxy config missing — needed for storefront→app communication
- Need `orders/create` webhook for purchase-signal tracking (substitution patterns)

## Requirements

### Functional
- Scopes reduced to minimum: `read_products,read_orders,read_themes`
- App proxy configured: prefix=apps, subpath=smartrec
- Webhook for orders/create added
- Webhook API version updated to 2025-10

### Non-functional
- Minimal permission footprint (easier App Store review)
- Clean config with no unused scopes

## Related Code Files
- **Modify:** `shopify.app.toml` — scopes, proxy, webhooks
- **Modify:** `app/shopify.server.ts` — verify ApiVersion matches
- **Create:** `app/routes/webhooks.app.orders-create.tsx` — orders/create handler stub
- **Create:** `app/routes/proxy.$.tsx` — app proxy catch-all route stub

## Implementation Steps

1. **Keep existing `shopify.app.toml` scopes** (validated: app may use write_products etc. for other features):
   ```toml
   [access_scopes]
   # Keep existing scopes, no changes needed — read_products + read_orders already present
   scopes = "read_content,read_orders,read_products,read_themes,write_content,write_products,write_themes"
   ```

2. **Add app proxy config to `shopify.app.toml`:**
   ```toml
   [app_proxy]
   url = "/proxy"
   prefix = "apps"
   subpath = "smartrec"
   ```

3. **Update webhook API version:**
   ```toml
   [webhooks]
   api_version = "2025-10"
   ```

4. **Add orders/create webhook subscription:**
   ```toml
   [[webhooks.subscriptions]]
   topics = ["orders/create"]
   uri = "/webhooks/app/orders-create"
   ```

5. **Create webhook handler stub** `app/routes/webhooks.app.orders-create.tsx`:
   - Import `authenticate.webhook` from shopify.server
   - Log payload for now, real logic in Intent Engine plan

6. **Create app proxy route stub** `app/routes/proxy.$.tsx`:
   - Use `authenticate.public.appProxy(request)` for auth
   - Return 200 JSON response for now
   - This catch-all handles all `/apps/smartrec/*` requests

7. **Run `npm run dev`** to verify app still installs with new scopes
   - Shopify will prompt merchant to re-approve if scopes changed

## Todo List
- [ ] Verify shopify.app.toml scopes (keep existing, no removals)
- [ ] Add [app_proxy] section to shopify.app.toml
- [ ] Update webhook api_version to 2025-10
- [ ] Add orders/create webhook subscription
- [ ] Create orders-create webhook handler stub
- [ ] Create app proxy catch-all route stub
- [ ] Verify app installs with new config

## Success Criteria
- `shopify app dev` runs without errors
- App proxy URL `https://<shop>/apps/smartrec/test` returns 200 from proxy route
- Reduced scopes accepted by dev store

## Risk Assessment
- **Scope change triggers re-auth:** Merchant must re-approve — acceptable in dev, plan for migration in production
- **App proxy not available on all plans:** App proxy works on all Shopify plans including Basic

## Security Considerations
- All proxy requests verified via `authenticate.public.appProxy()` (HMAC signature check)
- No write scopes = minimal attack surface

## Next Steps
- Phase 02: Theme App Extension Scaffold (depends on app proxy being configured)
