# Intent Engine Architecture Research Report

**Date:** 2026-03-05
**Topic:** Technical architecture for intent-based product recommendation engine
**Scope:** Shopify Admin API integration, caching, scoring, API design, session management

---

## 1. Shopify Orders Substitution Map

### Query Approach
Use GraphQL Admin API `orders` query with pagination and filtering to extract line item patterns.

**Key Data Available:**
- `LineItem` object includes: variant ID, product ID, quantity, price, discount allocations
- Orders filterable by date range, status, financial status, fulfillment status
- Pagination via cursor-based connections (first/after for large datasets)

**Pattern Extraction:**
Build "view → buy" substitution map by correlating:
- Product viewed (from analytics/session or Shopify catalog)
- Product purchased in same order (line item)
- Frequency of co-occurrence across all orders

**Without Customer Tracking:**
Since Shopify orders don't retain browsing data, derive intent from:
1. Order line item patterns (what bought together)
2. Historical bestsellers + variant similarities (category/attributes)
3. Storefront session analytics (if available via pixel)

**GraphQL Query Pattern:**
```graphql
query {
  orders(first: 50, query: "created>=2026-03-01") {
    edges {
      node {
        id
        createdAt
        lineItems(first: 10) {
          edges {
            node {
              id
              variantId
              productId
              quantity
              title
            }
          }
        }
      }
    }
    pageInfo { hasNextPage, endCursor }
  }
}
```

**Recommendation:** Query last 30 days of orders, batch process nightly to build substitution table.

---

## 2. Caching Strategy (4h per store)

### Three-Tier Comparison

| Layer | Option | Pros | Cons | MVPFit |
|-------|--------|------|------|--------|
| **L1** | In-Memory Map | Ultra-fast, zero latency | Lost on restart, single instance | ✅ Good |
| **L2** | SQLite | Persistent, queryable, simple | Slower than memory, not distributed | ✅ Recommended |
| **L3** | Upstash Redis | Distributed, shared across instances | Cold start latency, requires external service | ⚠️ Optional |

### Recommended MVP Strategy
**Two-tier hybrid:**
1. **SQLite table** `substitution_map(store_id, product_a, product_b, score, expires_at)`
   - Survives restarts
   - Query efficiently for "give me alternatives for product X"
   - TTL column triggers cleanup or lazy invalidation
2. **In-memory LRU cache** (e.g., Node.js Map or lru-cache package)
   - Caches most frequent queries (top 100 products per store)
   - 4h TTL checked on read

**Cache Invalidation:**
- Nightly: recompute substitution map from orders → write to SQLite
- Runtime: in-memory layer expires after 4h, refetch from SQLite
- On-demand: POST /api/refresh-alternatives (admin only) bypasses TTL

**Upstash Integration (Phase 2):**
Only if scaling to multi-instance deployment; start with SQLite + in-memory.

---

## 3. Intent Score Calculation

### Recommended Split

**Client-Side (Browser):**
- Display logic: rank alternatives by user scroll/click behavior
- Light scoring: boost score if alternative was viewed or scrolled into viewport
- Personalization: increase score if shopper browsed similar products earlier in session

**Server-Side (Node.js Action):**
- Compute baseline score: `score = co-purchase_frequency × product_popularity × relevance_boost`
  - Co-purchase frequency: % of orders where A and B bought together
  - Product popularity: relative sales volume
  - Relevance boost: variant attribute similarity (category, color, size range, price tier)
- Return scored list: `[{productId, score, reason}, ...]`
- Action mapping: server decides which products to show (limit top 5, exclude out-of-stock, apply business rules)

### Rationale
**Server-side** ensures consistency, audit trail, and business rule enforcement.
**Client-side** personalizes within server-provided candidates without round trips.

### Production Model (Future)
Implement two-stage ranking (L1 + L2) per recommendation literature:
- L1: Fast retriever (collaborative filtering + content similarity) on server
- L2: Neural ranker on server-side action (if latency permits)

---

## 4. API Route Design (React Router v7)

### Unauthenticated Storefront Routes

React Router v7 supports **resource routes** + **server actions** for API endpoints.

**Pattern for `/api/*` routes:**

```typescript
// app/routes/api.alternatives.tsx
export async function action({ request }) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { productId, storeId } = await request.json();

  // No Shopify admin auth; unauthenticated storefront call
  const alternatives = await queryAlternatives(productId, storeId);

  return new Response(JSON.stringify(alternatives), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
```

**Key Points:**
- Route name `api.alternatives.tsx` creates POST `/api/alternatives`
- No `authenticate.admin()` call; public endpoint
- Use `request.json()` to parse body
- Return `new Response()` with JSON headers
- Handle CORS if storefront is separate domain (add headers)

**Routes to Create:**
- `app/routes/api.intent.tsx` — POST: log shopper intent (view/click product)
- `app/routes/api.alternatives.tsx` — POST: fetch scored alternatives + session context
- `app/routes/api.config.tsx` — GET: fetch store config (recommender enabled, limit, etc.)

**CORS Setup:**
```typescript
headers: {
  "Access-Control-Allow-Origin": "*", // or specific domain
  "Content-Type": "application/json"
}
```

---

## 5. localStorage Session Management

### Shopper Session Schema
```json
{
  "sessionId": "uuid-v4",
  "storeId": "12345",
  "viewedProducts": [
    { "id": "gid://shopify/Product/1", "timestamp": 1709624400000, "durationMs": 5000 }
  ],
  "clickedAlternatives": ["gid://shopify/Product/2"],
  "createdAt": 1709620800000,
  "expiresAt": 1709624400000
}
```

### Data Size & Limits
- Single record: ~500 bytes (100 viewed products @ 5 bytes each)
- localStorage limit: 5–10 MiB per origin
- Safe quota: 1,000 concurrent sessions per origin
- **Recommendation:** Cap viewed products at 50 per session (2.5 KiB max)

### Expiry & Cleanup
- Set `expiresAt = now + 24h` on first load
- Check expiry on every read; clear if stale
- Fallback: browser auto-clears on tab close if using sessionStorage instead

### Privacy Best Practices
1. **No PII:** Store only product IDs, timestamps, anonymous session ID
2. **No Tracking:** Don't correlate with Shopify customer ID (unless user logs in)
3. **Transparent:** Show cookie/storage notice if required by GDPR/CCPA
4. **User Control:** Provide "clear session" button in cart or footer

**Choice: localStorage vs sessionStorage**
- **localStorage:** Persist across sessions (good for 24h retention)
- **sessionStorage:** Clear on tab close (safer, simpler privacy)
- **Recommendation:** Start with localStorage + 24h TTL; offer "clear data" option

### Implementation
```javascript
const session = {
  sessionId: crypto.randomUUID(),
  storeId: Shopify.shop,
  viewedProducts: [],
  createdAt: Date.now(),
  expiresAt: Date.now() + 24 * 60 * 60 * 1000
};

localStorage.setItem("smartrec_session", JSON.stringify(session));

// On read:
const stored = localStorage.getItem("smartrec_session");
if (stored && JSON.parse(stored).expiresAt < Date.now()) {
  localStorage.removeItem("smartrec_session"); // Lazy cleanup
}
```

---

## Summary & Recommendations

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **Order Data** | Nightly batch from Shopify Orders API | Non-blocking, avoids API rate limits |
| **Caching** | SQLite + in-memory LRU (4h TTL) | Simple, persistent, fast; Upstash in Phase 2 |
| **Scoring** | Server: covariance + rules; Client: personalization | Consistency + privacy-respecting |
| **API Routes** | React Router v7 resource routes + server actions | Native framework, no extra middleware |
| **Session** | localStorage + 24h TTL, capped at 50 products | Privacy-safe, sufficient for MVP |

**Next Steps:**
1. Implement Shopify GraphQL order query + nightly cron
2. Build SQLite schema for `substitution_map` table
3. Create `/api/alternatives` endpoint with server-side scoring
4. Integrate localStorage session tracking in storefront JS snippet

---

**Sources:**
- [Shopify GraphQL Admin API: Orders Query](https://shopify.dev/docs/api/admin-graphql/latest/queries/orders)
- [Shopify GraphQL Admin API: LineItem Object](https://shopify.dev/docs/api/admin-graphql/latest/objects/LineItem)
- [React Router: Actions](https://reactrouter.com/start/framework/actions)
- [React Router: Resource Routes](https://dev.to/rgolawski/resource-routes-in-react-router-v7-l2)
- [Redis Caching Strategies](https://redis.io/blog/guide-to-cache-optimization-strategies/)
- [Browser Storage Quotas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Recommendation Systems Architecture](https://themlarchitect.com/blog/recommendation-systems-an-architects-playbook-part-1/)
- [Session Management Best Practices - Shopify](https://www.shopify.com/blog/session-management)
