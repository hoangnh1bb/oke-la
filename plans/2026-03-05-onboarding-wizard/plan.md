# Plan: Onboarding Wizard + Live Preview
**SmartRec — Feature Build Plan**
Date: 2026-03-05 | Stack: React Router v7 + Polaris Web Components + Prisma SQLite

---

## Overview

Build the first-run Onboarding Wizard shown immediately after app install. Displays once. Three steps:
1. **Feature Selection** — 4 widget toggle cards
2. **Live Preview** — Split screen: widget list (left) + real storefront iframe (right), postMessage preview
3. **Go Live** — Summary + inject script tag via Shopify Script Tags API

---

## Phases

| # | Phase | Files | Est. |
|---|-------|-------|------|
| 1 | [DB + Config API](phase-01-db-config.md) | schema.prisma, api.config, lib/merchant-config | 45m |
| 2 | [Routing & Onboarding Guard](phase-02-routing-guard.md) | app.tsx, app.onboarding.tsx | 20m |
| 3 | [Step 1 — Feature Selection UI](phase-03-step1-ui.md) | app.onboarding.tsx (step 1) | 30m |
| 4 | [Preview Script](phase-04-preview-script.md) | public/smartrec-preview.js | 45m |
| 5 | [Step 2 — Live Preview UI](phase-05-step2-preview.md) | app.onboarding.tsx (step 2), api.onboarding.tsx | 60m |
| 6 | [Step 3 — Go Live UI](phase-06-step3-golive.md) | app.onboarding.tsx (step 3), api.config.tsx | 30m |
| 7 | [Polish & Edge Cases](phase-07-polish.md) | All | 30m |

**Total estimate: ~4.5 hours**

---

## Architecture Decision: Live Preview iframe

**Problem**: Step 2 embeds merchant's real storefront in iframe. Our preview widgets
need to render inside that iframe. But script tag hasn't been injected yet (that's Step 3).

**Decision: Temporary Preview Script Tag**

When merchant reaches Step 2:
1. Server injects a temporary `smartrec-preview.js` script tag via `scriptTagCreate` mutation
2. Storefront iframe loads → preview script is already on the page
3. Preview script listens for `postMessage` with `type: 'smartrec_preview_signal'`
4. On Step 3 "Go Live" → replace preview script with production `smartrec.js`
5. If merchant abandons → webhook or uninstall cleans up the preview script tag

**Why not alternatives:**
- Proxy route (fetch+modify store HTML): complex, Liquid CSP issues
- Service worker: overkill, cross-origin limitation
- Script tag approach: native Shopify pattern, clean, reversible

---

## Data Model

```prisma
model MerchantConfig {
  id              String   @id @default(cuid())
  shop            String   @unique
  onboarded       Boolean  @default(false)
  widgetConfig    String   @default("{}")   // JSON: { alternative_nudge: true, comparison_bar: true, ... }
  previewScriptId String?                   // Shopify script tag GID (for cleanup)
  scriptTagId     String?                   // Production script tag GID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## PostMessage Protocol

```ts
// Admin app → storefront iframe
iframeRef.contentWindow.postMessage(
  {
    type: 'smartrec_preview_signal',
    widget: 'alternative_nudge' | 'comparison_bar' | 'tag_navigator' | 'trust_nudge',
    payload: {
      // widget-specific demo data
      products: [...],       // from real store (first 4)
      score: 65,
      signal: 'size_chart_open'
    }
  },
  `https://${shop}` // targetOrigin — must match exactly
);
```

---

## New Files

```
app/
├── routes/
│   ├── app.onboarding.tsx          # Wizard (all 3 steps, client-state only)
│   ├── api.onboarding.tsx          # Loader: fetch products + inject preview script
│   └── api.config.tsx              # GET/POST merchant settings + go-live
├── lib/
│   ├── merchant-config.server.ts   # DB helpers for MerchantConfig
│   └── script-tags.server.ts       # scriptTagCreate/Delete GraphQL helpers
public/
└── smartrec-preview.js             # Storefront preview script (< 8KB)

prisma/
└── migrations/
    └── YYYYMMDD_add_merchant_config/ migration.sql
```

---

## Modified Files

```
prisma/schema.prisma          # Add MerchantConfig model
app/routes/app.tsx            # Add onboarding redirect guard in loader
app/routes/app._index.tsx     # Remove template boilerplate, add dashboard stub
```

---

## Sequence Diagram

```
Merchant installs app
        │
        ▼
  app.tsx loader ──► check MerchantConfig.onboarded
        │                       │
     false                    true
        │                       │
        ▼                       ▼
 redirect /app/onboarding   /app (dashboard)
        │
        ▼
   Step 1: Feature Selection (local state)
        │ Next →
        ▼
   api.onboarding loader:
     - authenticate.admin
     - fetchFirst4Products (GraphQL)
     - scriptTagCreate (preview script)
     - save previewScriptId to DB
        │
        ▼
   Step 2: Live Preview
     - render storefront iframe
     - on Preview click → postMessage to iframe
        │ Next →
        ▼
   Step 3: Go Live
     - show summary
     - on "Enable SmartRec":
         POST api.config:
           - save widgetConfig to DB
           - scriptTagDelete (preview) 
           - scriptTagCreate (production)
           - set onboarded = true
        │
        ▼
   redirect /app (dashboard)
```

---

## Key Constraints

- **One-time show**: Once `onboarded = true`, wizard never shows again
- **Real products**: Step 2 uses actual store products (first 4 from `products(first: 4)`)
- **Cross-origin iframe**: `postMessage` requires exact `targetOrigin` = `https://{shop}`
- **Polaris web components**: All UI uses `s-*` elements (no React Polaris components)
- **No blocking**: Preview script must be `async`, non-blocking
- **Script tag scope**: `write_script_tags` already in `shopify.app.toml` scopes
