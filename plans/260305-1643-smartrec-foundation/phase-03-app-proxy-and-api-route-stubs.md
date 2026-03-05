# Phase 03 — App Proxy & API Route Stubs

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-app-config-and-permissions.md)
- Research: [Theme Extensions & Proxy](./research/researcher-01-theme-extensions-and-proxy.md)
- PRD Section 4.4: Intent API Endpoint

## Overview
- **Priority:** P1 — Storefront JS needs these endpoints
- **Status:** pending
- **Description:** Create app proxy catch-all route and individual API route stubs for signal tracking, intent evaluation, product recommendations, and merchant config. All stubs return placeholder responses — real logic in feature plans.

## Key Insights
- App proxy routes storefront requests `https://<shop>/apps/smartrec/*` → app server `/proxy/*`
- Authentication via `authenticate.public.appProxy(request)` — HMAC verified automatically
- Single catch-all route `proxy.$.tsx` can dispatch to sub-handlers, OR use separate proxy route files
- **Decision:** Use single `proxy.$.tsx` catch-all that dispatches by path segment — simpler routing, single auth point
- Storefront JS uses `fetch()` to same-origin `/apps/smartrec/*` — no CORS issues

## Requirements

### Functional
- `POST /apps/smartrec/track` — receive behavioral signal events from storefront
- `POST /apps/smartrec/intent` — receive session state + score, return action type
- `GET /apps/smartrec/products` — return product recommendations for a given product
- `GET /apps/smartrec/config` — return merchant widget settings for storefront JS
- All routes authenticate via app proxy HMAC verification

### Non-functional
- Stubs return valid JSON shape matching final API contracts
- Response time target: < 200ms (stubs are instant, sets expectation)
- Error responses follow consistent shape: `{ error: string, code: string }`

## Architecture

```
Storefront JS                   Shopify Proxy                App Server
─────────────                   ─────────────                ──────────
fetch(/apps/smartrec/track)  →  HMAC + forward  →  proxy.$.tsx (loader/action)
                                                      ├─ /track   → handleTrack()
                                                      ├─ /intent  → handleIntent()
                                                      ├─ /products→ handleProducts()
                                                      └─ /config  → handleConfig()
```

## Related Code Files
- **Create:** `app/routes/proxy.$.tsx` — catch-all proxy route with dispatcher
- **Create:** `app/lib/proxy-handlers.server.ts` — handler functions (stubs)
- **Modify:** `shopify.app.toml` — already done in Phase 01 (app_proxy section)

## Implementation Steps

1. **Create `app/routes/proxy.$.tsx`:**
   ```tsx
   import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
   import { authenticate } from "../shopify.server";
   import { handleTrack, handleIntent, handleProducts, handleConfig } from "../lib/proxy-handlers.server";

   // Extract sub-path from catch-all: /proxy/track → "track"
   function getSubpath(request: Request): string {
     const url = new URL(request.url);
     // Shopify proxies /apps/smartrec/* → /proxy/*
     const segments = url.pathname.replace(/^\/proxy\/?/, "").split("/");
     return segments[0] || "";
   }

   // GET requests: products, config
   export const loader = async ({ request }: LoaderFunctionArgs) => {
     await authenticate.public.appProxy(request);
     const subpath = getSubpath(request);
     const url = new URL(request.url);

     switch (subpath) {
       case "products":
         return handleProducts(url.searchParams);
       case "config":
         return handleConfig(url.searchParams);
       default:
         return json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
     }
   };

   // POST requests: track, intent
   export const action = async ({ request }: ActionFunctionArgs) => {
     await authenticate.public.appProxy(request);
     const subpath = getSubpath(request);
     const body = await request.json();

     switch (subpath) {
       case "track":
         return handleTrack(body);
       case "intent":
         return handleIntent(body);
       default:
         return json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
     }
   };
   ```

2. **Create `app/lib/proxy-handlers.server.ts`:**
   ```ts
   import { json } from "react-router";

   // POST /apps/smartrec/track — receive behavioral signals
   export async function handleTrack(body: unknown) {
     // TODO: Validate body, store signals, update session
     console.log("[SmartRec] Track event:", JSON.stringify(body).slice(0, 200));
     return json({ ok: true });
   }

   // POST /apps/smartrec/intent — evaluate intent score, return action
   export async function handleIntent(body: unknown) {
     // TODO: Calculate intent score, decide action
     return json({ type: "none", data: null });
   }

   // GET /apps/smartrec/products?productId=X — get recommendations
   export async function handleProducts(params: URLSearchParams) {
     const productId = params.get("productId");
     // TODO: Fetch alternatives based on substitution patterns
     return json({ products: [], productId });
   }

   // GET /apps/smartrec/config?shop=X — get merchant widget settings
   export async function handleConfig(params: URLSearchParams) {
     // TODO: Read from DB, return merchant settings
     return json({
       enabled: true,
       thresholds: { browsing: 30, considering: 55, highConsideration: 75, strongIntent: 89 },
       widgets: {
         alternative_nudge: true,
         comparison_bar: true,
         tag_navigator: true,
         trust_nudge: true,
       },
     });
   }
   ```

3. **Test via browser:**
   - Start `shopify app dev`
   - Visit `https://<shop>/apps/smartrec/config` — should return JSON settings
   - Use browser console on storefront:
     ```js
     fetch('/apps/smartrec/track', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ event: 'test' })
     }).then(r => r.json()).then(console.log)
     ```

## Todo List
- [ ] Create proxy.$.tsx catch-all route with auth + dispatcher
- [ ] Create proxy-handlers.server.ts with 4 stub handlers
- [ ] Test GET /apps/smartrec/config returns JSON
- [ ] Test POST /apps/smartrec/track returns { ok: true }
- [ ] Test POST /apps/smartrec/intent returns { type: "none" }
- [ ] Test GET /apps/smartrec/products returns { products: [] }
- [ ] Verify 404 for unknown sub-paths

## Success Criteria
- All 4 endpoints return valid JSON with correct shapes
- App proxy authentication works (no HMAC errors)
- Storefront JS can call endpoints without CORS issues
- Unknown paths return 404 with error shape

## Risk Assessment
- **Body parsing:** `request.json()` may throw if body malformed — add try/catch in action
- **Rate limiting:** No rate limiting in stubs — acceptable for MVP, add in production hardening

## Security Considerations
- All requests verified via `authenticate.public.appProxy()` — prevents spoofed requests
- Body size not validated yet — add limit in Intent Engine plan
- No PII stored in this phase (stubs only log to console)

## Next Steps
- Phase 04: Database Schema (so handlers have somewhere to persist data)
- Signal Collector plan: Replace track stub with real signal storage
- Intent Engine plan: Replace intent stub with score→action logic
