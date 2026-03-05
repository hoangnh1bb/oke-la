---
title: "SmartRec Intent-Based Product Discovery"
description: "Build behavioral intent detection system with storefront widgets for Shopify"
status: in-progress
priority: P1
effort: 8h
branch: main
tags: [shopify, intent-engine, storefront, theme-extension, polaris]
created: 2026-03-05
---

# SmartRec — Intent-Based Product Discovery

Intent-first product discovery app. Detects shopper behavioral signals in real-time, calculates Intent Score (0-100), triggers contextual widgets only when signals indicate uncertainty. Score 90+ = show nothing.

## Critical Architecture Decisions

- **Theme App Extensions** (not Script Tags — deprecated, blocks App Store)
- **App Proxy** for storefront-to-server communication (solves CORS)
- **SQLite + in-memory LRU** for substitution cache (skip Redis for MVP)
- **React Router v7 resource routes** for storefront API (no admin auth)
- Scopes: `read_products,read_orders` only (2 scopes, easy merchant approval)

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Foundation & Database | 1h | done | [phase-01](phase-01-foundation-database.md) |
| 2 | Theme Extension + Signal Collector | 2h | done | [phase-02](phase-02-theme-extension-signal-collector.md) |
| 3 | Intent Engine API Routes | 1.5h | done | [phase-03](phase-03-intent-engine-api.md) |
| 4 | Widget Renderer | 1.5h | pending | [phase-04](phase-04-widget-renderer.md) |
| 5 | Admin Dashboard | 1h | pending | [phase-05](phase-05-admin-dashboard.md) |
| 6 | Polish & Integration | 1h | pending | [phase-06](phase-06-polish-integration.md) |

## Key Dependencies

- Phase 2 depends on Phase 1 (Prisma models, API service)
- Phase 3 depends on Phase 1 (substitution engine, DB)
- Phase 4 depends on Phase 2 + 3 (signals + API responses)
- Phase 5 depends on Phase 1 (settings model, analytics model)
- Phase 6 depends on all prior phases

## References

- [PRD v2.0](/Users/bbuser/Documents/oke-la/PRD.0.1.md)
- [Signal Collector Spec](/Users/bbuser/Documents/oke-la/signalcollector.md)
- [Script Tags Research](reports/researcher-01-script-tags-api.md)
- [Intent Engine Research](reports/researcher-02-intent-engine-architecture.md)

## Acceptance Criteria

12 criteria from PRD Section 7 — all MUST items required before ship.
Key: F-03 (score 90-100 = NO recommendations) is the philosophical differentiator.
