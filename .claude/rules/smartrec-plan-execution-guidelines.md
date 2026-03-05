# SmartRec Plan Execution Guidelines

Rules for agents implementing SmartRec feature plans. Read `shopify-app-development-knowledge.md` first.

---

## Plan Structure

All SmartRec plans live in `plans/260305-1643-smartrec-foundation/`. Future feature plans will be separate directories.

**Execution order matters:**
1. Foundation (this plan) — scopes, proxy, extension scaffold, DB schema
2. Signal Collector — storefront JS tracking 8 behavioral signals
3. Intent Engine — server-side score→action logic
4. Widget Renderer — 4 UI components injected on storefront
5. Admin Dashboard — Polaris settings + analytics
6. MCP Integration — conversational product matching (future)

---

## Implementation Rules for Each Plan

### Before starting any phase:
- Read the phase file completely
- Read all linked research files
- Check `shopify-app-development-knowledge.md` for Shopify patterns
- Verify prerequisites (previous phases) are complete

### During implementation:
- Follow the **Implementation Steps** numbered list exactly
- Check off items in the **Todo List** as you complete them
- Run `npm run typecheck` after every file change
- Ignore `app/ai-assistant/` typecheck errors (pre-existing, deferred to v1.1)

### After implementation:
- Verify all **Success Criteria** in the phase file
- Update the phase status in `plan.md` to `complete`

---

## File Placement Rules

| Type | Location | Naming |
|------|----------|--------|
| Admin pages | `app/routes/app.<name>.tsx` | Dot-separated flat routes |
| Proxy logic | `app/routes/proxy.$.tsx` | Single catch-all, switch dispatcher |
| Webhook handlers | `app/routes/webhooks.app.<topic>.tsx` | Topic with dashes |
| Server utilities | `app/lib/<module>.server.ts` | `.server.ts` suffix for server-only |
| Shared types | `app/types/<name>.ts` | TypeScript interfaces/types |
| Theme extension | `extensions/smartrec-theme-extension/` | Shopify CLI managed |
| Prisma schema | `prisma/schema.prisma` | Single file, add models here |

---

## Proxy Route Dispatcher Pattern

All storefront→app requests go through `proxy.$.tsx`. Do NOT create separate proxy route files.

```tsx
// proxy.$.tsx — add new subpaths to the switch statement
const subpath = url.pathname.replace(/^\/proxy\/?/, "");
switch (subpath) {
  case "track":    // Signal Collector
  case "intent":   // Intent Engine
  case "products": // Widget Renderer
}
```

When a handler grows complex, extract logic to `app/lib/<module>.server.ts` and import it.

---

## Theme App Extension Pattern

- Extensions live in `extensions/smartrec-theme-extension/`
- Use **App Embed Block** (not App Block) — auto-injected on all pages
- JS files: `assets/signal-collector.js`, `assets/widget-renderer.js`
- Liquid block: `blocks/app-embed.liquid` — passes page context to JS
- Communicate with app server via: `fetch('/apps/smartrec/<subpath>')`
- No cookies available — use URL params for shop/customer context

---

## Database Model Guidelines

- All SmartRec models go in `prisma/schema.prisma` alongside Session
- Use `@@map("smartrec_<table>")` to namespace tables
- Always include `createdAt` and `updatedAt` timestamps
- For hot data (ProductCache), also use in-memory Node.js Map — see Phase 04
- After schema changes: `npx prisma migrate dev --name smartrec-<description>`

---

## Testing Proxy Routes Locally

App proxy only works through Shopify's domain. To test:
1. Run `npm run dev` (creates tunnel)
2. Open storefront: `https://<dev-store>.myshopify.com`
3. Test proxy: `https://<dev-store>.myshopify.com/apps/smartrec/`
4. Check server logs for request handling

Cannot test proxy routes via `localhost` — Shopify HMAC signature won't be present.
