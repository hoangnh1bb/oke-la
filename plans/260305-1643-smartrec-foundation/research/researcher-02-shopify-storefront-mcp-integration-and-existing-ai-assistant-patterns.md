# Research: MCP Integration & Existing AI Assistant Code

Date: 2026-03-05

---

## 1. Existing AI Assistant Structure

Located at `app/ai-assistant/`, well-structured into 4 concerns:

```
handlers/     chat-handler.ts, suggestion-generator.ts
prompts/      system-prompts.ts, user-prompts.ts
services/     mcp-client.ts, conversation-handler.ts, stream-manager.ts
              llm/ (gemini-client, tool-converter, content-formatter, response-handler)
              workflow/ (tool-executor, tool-runner, context-builder, llm-generator, memory-manager)
              tracing/ (langsmith-tracer, usage-tracker)
tools/        search_shop_policies.ts, search_additional_knowledge.ts, generate_section_html.ts
```

### Key patterns in use

- **LangChain `DynamicStructuredTool`** — tools defined with Zod schemas, plugged into LLM tool-calling loop
- **Agentic loop** — `executeTools` → `shouldContinue` → `finalizeResponse` (max-iterations guard)
- **Stream manager** — SSE-style streaming with typed events (`NEW_MESSAGE`, `MESSAGE_COMPLETE`, `END_TURN`, `PRODUCT_RESULTS`)
- **LangSmith tracing** — wraps tool execution for observability
- **Gemini LLM client** — primary LLM (not OpenAI)

### MCP client (`services/mcp-client.ts`)

Connects to Shopify's **Storefront MCP endpoint** (`https://{shop}/api/mcp`) via JSON-RPC 2.0:
- `tools/list` — discovers available storefront tools
- `tools/call` — invokes a tool by name with arguments
- Filters to 2 tools: `SEARCH_SHOP_CATALOG` and `SEARCH_SHOP_POLICIES_AND_FAQS`
- Converts JSON Schema → Zod at runtime for LangChain compatibility
- Also registers local tools (e.g., `searchShopPoliciesTool`) that call Admin/Storefront API directly

### Shopify API usage patterns found

- `search_shop_policies.ts` — Storefront API GraphQL via `shopify.clients.Storefront` (offline session)
- MCP `SEARCH_SHOP_CATALOG` — delegates to Shopify's native storefront search (semantic/keyword)
- References to `@pfserver/...` package paths — this code was ported from a separate monorepo; import paths need updating for this repo

---

## 2. Shopify MCP for Product Queries — Assessment

### What Shopify Storefront MCP provides

`https://{shop}/api/mcp` exposes tools including:
- `search_shop_catalog` — semantic + keyword product search, returns product cards with variants/prices
- `search_shop_policies_and_faqs` — policy retrieval
- `update_cart` — cart mutations (schema has known bug noted in code)

### Suitability for SmartRec

| Use case | MCP | Direct Admin API | Verdict |
|---|---|---|---|
| Semantic product search (storefront context) | Yes — native Shopify NLP | No native equivalent | **MCP wins** |
| Fetch product by ID/handle | Overkill | Simple GraphQL | **Admin API** |
| Bulk catalog fetch for offline indexing | Not designed for this | `products` query + pagination | **Admin API** |
| Real-time recommendation filtering (price, tags, collections) | Limited control | Full query flexibility | **Admin API** |
| Intent-driven product matching (conversational) | Good fit | Requires custom embedding | **MCP wins** |

### Practical verdict

- **Use MCP `search_shop_catalog`** for conversational/intent-driven product queries — it's already wired, battle-tested, and avoids reimplementing search
- **Use Admin API directly** for: fetching product metadata, collection membership, inventory, variant details, bulk catalog sync
- MCP is a **runtime tool** (per-request), not a batch indexing mechanism — not suitable as a data source for pre-computed recommendations

---

## 3. Current App Configuration

### `shopify.app.toml`
- Scopes: `read_content, read_orders, read_products, read_themes, write_content, write_products, write_themes`
- Already has `read_products` and `read_orders` — sufficient for SmartRec product + order data access
- Webhooks: `app/scopes_update`, `app/uninstalled` — need to add `orders/create` for purchase-signal tracking
- API version: `2023-07` (stale — server uses `ApiVersion.October25`)

### `prisma/schema.prisma`
- Only `Session` model exists — blank slate for SmartRec data models
- SQLite provider — fine for local/dev, limits concurrent writes at scale (acceptable for MVP)

### `app/shopify.server.ts`
- Uses `ApiVersion.October25` (2025-10) — current
- `expiringOfflineAccessTokens: true` — sessions may expire; handlers need refresh logic
- Standard `authenticate.admin(request)` pattern — used in every protected route

---

## 4. Import Path Issue

All AI assistant files import from `@pfserver/...` namespace:
```ts
import MCPClient from '@pfserver/modules/ai-sales-page/controllers/ai-assistant/services/mcp-client'
import { TOOL_NAMES } from '@pfserver/modules/ai-sales-page/constants/tools'
```

These are stale paths from the source monorepo. The actual files now live in `app/ai-assistant/`. Path aliases must be updated in `tsconfig.json` / `vite.config.ts` or imports rewritten before this code compiles in this repo.

---

## Unresolved Questions

1. Is `@pfserver/...` alias configured somewhere (tsconfig paths, vite aliases)? Code may already compile — needs `npm run typecheck` to verify.
2. Does `https://{shop}/api/mcp` require a Storefront API access token or is it unauthenticated? Current code sends no auth header — may break on non-public shops.
3. Should SmartRec store pre-computed recommendation vectors in SQLite or use MCP search at query time? (Performance vs. complexity tradeoff.)
4. Webhook API version mismatch: `shopify.app.toml` says `2023-07`, server uses `October25` — intentional or oversight?
