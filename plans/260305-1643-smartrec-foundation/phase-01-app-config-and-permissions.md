# Phase 01 — App Config & Permissions

## Context Links
- Parent: [plan.md](./plan.md)
- PRD: [PRD.0.1.md](../../PRD.0.1.md)
- Research: [Theme Extensions & Proxy](./research/researcher-01-theme-extensions-and-proxy.md)

## Overview
- **Priority:** P1 — Must complete first, all other phases depend on this
- **Status:** complete
- **Description:** Update shopify.app.toml webhook API version, add app proxy config, create proxy route stub

## Key Insights
- Current scopes include write_products, write_content, write_themes — keep them (app may have other features beyond SmartRec)
- Webhook API version is `2023-07` but server uses `ApiVersion.October25` — must align
- App proxy config missing — needed for storefront→app communication
- ~~`orders/create` webhook~~ — DEFERRED to Intent Engine plan (YAGNI: focus on storefront behavior signals first)

## Requirements

### Functional
- Scopes reduced to minimum: `read_products,read_orders,read_themes`
- App proxy configured: prefix=apps, subpath=smartrec
- Webhook API version updated to 2025-10

### Non-functional
- Minimal permission footprint (easier App Store review)
- Clean config with no unused scopes

## Related Code Files
- **Modify:** `shopify.app.toml` — scopes, proxy, webhooks
- **Modify:** `app/shopify.server.ts` — verify ApiVersion matches
- **Create:** `app/routes/proxy.$.tsx` — app proxy catch-all route stub
- ~~**Create:** `app/routes/webhooks.app.orders-create.tsx`~~ — DEFERRED to Intent Engine plan

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

4. **Create app proxy route stub** `app/routes/proxy.$.tsx`:
   - Use `authenticate.public.appProxy(request)` for auth
   - Return 200 JSON response for now
   - This catch-all handles all `/apps/smartrec/*` requests

7. **Run `npm run dev`** to verify app still installs with new scopes
   - Shopify will prompt merchant to re-approve if scopes changed

## Todo List
- [x] Verify shopify.app.toml scopes (keep existing, no removals)
- [x] Add [app_proxy] section to shopify.app.toml
- [x] Update webhook api_version to 2025-10
- [x] Create app proxy catch-all route stub (proxy.$.tsx)
- [x] Typecheck passes (no new errors)
- [ ] ~~Add orders/create webhook~~ — DEFERRED to Intent Engine plan
- [ ] ~~Create orders-create webhook handler~~ — DEFERRED to Intent Engine plan

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
