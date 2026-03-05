---
title: "SmartRec Foundation & Architecture"
description: "Foundation plan for SmartRec intent-based product discovery Shopify app"
status: pending
priority: P1
effort: 6h
branch: main
tags: [smartrec, foundation, shopify, theme-extension, app-proxy, prisma]
created: 2026-03-05
---

# SmartRec — Foundation & Architecture Plan

## Overview

Build the foundational layer for SmartRec, an intent-based product discovery Shopify app. This plan covers ONLY infrastructure: permissions, theme extension scaffold, app proxy, database schema, API route stubs, and agent guidelines. Feature logic (signal collector, intent engine, widgets, admin dashboard) are separate plans.

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│ Shopify Storefront (merchant's theme)               │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Theme App Extension (App Embed Block)           │ │
│  │  • signal-collector.js — tracks behavior        │ │
│  │  • widget-renderer.js — injects recommendation  │ │
│  │  • Liquid: passes productId, pageType, etc.     │ │
│  └──────────────┬──────────────────────────────────┘ │
│                 │ fetch(/apps/smartrec/*)             │
└─────────────────┼───────────────────────────────────┘
                  │ App Proxy (same-origin, no CORS)
┌─────────────────┼───────────────────────────────────┐
│ SmartRec App Server (React Router v7)               │
│  ├─ /proxy/track    — receives behavioral signals   │
│  ├─ /proxy/intent   — returns action for score      │
│  ├─ /proxy/products — returns recommendations       │
│  ├─ /app/*          — Admin dashboard (Polaris)     │
│  └─ lib/            — intent-engine, product-cache  │
│     └─ MCP client   — search_shop_catalog (future)  │
├─ Prisma/SQLite — sessions, settings, signal cache   │
└─ Shopify Admin API — read_products, read_orders     │
```

## Scopes Required (All Phases)

| Scope | Phase | Purpose |
|---|---|---|
| `read_products` | Foundation | Product data for recommendations |
| `read_orders` | Foundation | Order history for substitution patterns |
| `read_themes` | Foundation | Verify theme extension installation |
| `write_products` | Remove | Not needed — SmartRec reads only |
| `write_content` | Remove | Not needed |
| `read_content` | Remove | Not needed |
| `write_themes` | Remove | Theme extensions don't need this |

**New scopes:** None beyond read_products + read_orders + read_themes.
**App proxy:** Configured in shopify.app.toml, no scope needed.

## Phases

| # | Phase | Status | Effort | File |
|---|---|---|---|---|
| 01 | App Config & Permissions | **complete** | 0.5h | [phase-01](./phase-01-app-config-and-permissions.md) |
| 02 | Theme App Extension Scaffold | pending | 1.5h | [phase-02](./phase-02-theme-app-extension-scaffold.md) |
| 03 | App Proxy & API Routes | pending | 1.5h | [phase-03](./phase-03-app-proxy-and-api-route-stubs.md) |
| 04 | Database Schema | pending | 1h | [phase-04](./phase-04-database-schema-and-prisma-models.md) |
| 05 | Agent Guidelines & Feature Plans | pending | 1h | [phase-05](./phase-05-agent-guidelines-and-future-feature-plans.md) |

## Future Plans (Separate)

- **Plan: Signal Collector** — signal-collector.js implementation (all 8 signals + intent score calc)
- **Plan: Intent Engine** — server-side score→action logic, product recommendation algorithms
- **Plan: Widget Renderer** — 4 UI components (alternative_nudge, comparison_bar, tag_navigator, trust_nudge)
- **Plan: Admin Dashboard** — Polaris settings page + analytics
- **Plan: MCP Integration** — search_shop_catalog for conversational product matching

## Validation Summary

**Validated:** 2026-03-05
**Questions asked:** 7

### Confirmed Decisions
- **Scopes:** Keep existing scopes (write_products, etc.) + add SmartRec needs. Do NOT strip — app may have other features.
- **Routing:** Single catch-all proxy.$.tsx with switch dispatcher. Confirmed.
- **Storage:** SQLite + in-memory Node.js cache (Map) for hot data. No Redis for MVP.
- **Intent Score:** Client-side calculation only. Server trusts client score. Simpler MVP.
- **AI Assistant code:** Leave app/ai-assistant/ as-is. Don't fix imports, don't delete. Defer to v1.1.
- **DB Models:** Create all 4 models upfront in one migration. Ready for all feature plans.
- **Proxy subpath:** Use "smartrec" (feature-specific), not "plug-play" (app name).

### Action Items
- [ ] Update Phase 01: keep existing scopes, only ADD new ones (don't remove write_products etc.)
- [ ] Update Phase 04: add in-memory cache layer (Node.js Map) alongside SQLite for ProductCache

## Research

- [Theme Extensions & App Proxy](./research/researcher-01-theme-extensions-and-proxy.md)
- [MCP & Existing AI Code](./research/researcher-02-shopify-storefront-mcp-integration-and-existing-ai-assistant-patterns.md)
