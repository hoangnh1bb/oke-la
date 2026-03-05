# Shopify Script Tags API Research

**Date:** 2026-03-05 | **Focus:** Storefront script injection for intent signal collection

---

## 1. Shopify Script Tags API Status

**Current State:** Still functional but **deprecated for production use** on Shopify App Store.

- **Scope Required:** `write_script_tags` (still valid; documented in 2025-01 and latest API versions)
- **GraphQL Mutation:** `scriptTagCreate` with input `{src, displayScope, cache}`
- **Key Limitation:** Only works with **vintage themes** (pre-Online Store 2.0)
- **Deprecation Timeline:**
  - Feb 1, 2025: ScriptTag blocked on checkout pages
  - Aug 28, 2025: Order status page sunset for Plus merchants
  - Aug 26, 2026: Order status page sunset for non-Plus merchants
- **Verdict:** ⚠️ Not recommended for new apps or App Store submission

---

## 2. CORS for Storefront-to-App Communication

**Challenge:** Browser CORS blocks direct storefront scripts → app server calls across origins.

**Solutions:**

| Approach | Pros | Cons |
|----------|------|------|
| **App Proxy** | Bypasses CORS (requests via Shopify infrastructure); most secure | Shopify-managed; routing overhead |
| **Direct tunnel (e.g., Cloudflare)** | Simple setup | CORS failures; requires explicit allow headers; insecure for production |
| **Storefront API** | Has CORS support for registered domains | Limited to cart/checkout context |

**For MVP Signal Collector:** App Proxy is **mandatory** if injecting scripts on storefront. Direct tunnel calls will fail in production browsers.

---

## 3. Serving Static JS (signal-collector.js, widget-renderer.js)

**Best Practices:**

1. **Theme App Extensions (Recommended):** Assets in `assets/` folder auto-served from Shopify CDN, minified/compressed (Brotli+gzip)
2. **App Server `/public` Route:** Works for development; slower than CDN for production
3. **External CDN:** Reduces app server load; requires CORS headers from storefront
4. **Do Not:** Use multiple domains (Shopify recommends max 2 domains)

**For MVP:** Serve from app server `/public` during dev; migrate to theme asset CDN when using theme extensions.

---

## 4. Rate Limiting Strategy

**Shopify API Model:** Leaky bucket algorithm. 60 marbles/burst; 1 marble restored/sec per request.

**POST Request Cost:** Same as GET (doesn't cost more despite side effects).

**For Signal Collection:** ~1 POST per page view per shopper = high volume.

**Mitigation:**
- Cache frequently requested data
- Implement client-side throttling (e.g., 1 signal per 5 seconds per session)
- Use background job queues for non-blocking writes
- Monitor API response headers for usage metadata
- Implement exponential backoff on 429 errors

---

## 5. Script Tags vs Theme App Extensions (MVP Decision)

| Feature | Script Tags | Theme App Extensions |
|---------|-------------|----------------------|
| **No merchant setup** | ✅ Auto-inject | ❌ Requires theme block install |
| **App Store submission** | ❌ Blocked | ✅ Required |
| **Modern OS2.0 themes** | ❌ Incompatible | ✅ Designed for |
| **Deprecation risk** | ⚠️ High (2025-2026) | ✅ None |
| **CORS handling** | Manual (via Proxy) | Shopify-managed |

---

## Recommendation Summary

**For MVP SmartRec Intent Discovery:**

1. **Do not use Script Tags** — Deprecated and incompatible with modern themes. Blocks App Store submission.

2. **Use Theme App Extensions instead:**
   - Create a theme app block (`blocks/signal-collector.json`) with UI extension
   - Render signal-collector.js from app server (dev) or theme CDN (prod)
   - Use App Proxy for storefront POST → `/api/intent` calls (handles CORS)

3. **Fallback for non-OS2.0 stores:** Script Tags work for vintage themes but expect merchant churn as Shopify sunsets the feature.

4. **Rate limiting:** Implement client-side throttling + background job queues from day one. Budget for ~2-3 API marbles per shopper per session.

5. **Static asset serving:** Host from app `/public` initially; move to theme CDN assets when theme extensions launch.

---

## Unresolved Questions

- What is the exact traffic profile (page views/day, shoppers/day)?
- Does the Shopify app use Shopify CLI's tunnel or a custom Cloudflare setup?
- Are target merchants predominantly on OS2.0 themes or legacy?

---

**Sources:**
- [ScriptTag - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/latest/objects/ScriptTag)
- [scriptTagCreate - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/latest/mutations/scriptTagCreate)
- [The ScriptTag resource (legacy)](https://shopify.dev/docs/apps/build/online-store/script-tag-legacy)
- [ScriptTag functionality to be blocked as of February 1, 2025](https://shopify.dev/docs/apps/build/online-store/blocking-script-tags)
- [REST Admin API rate limits](https://shopify.dev/docs/api/admin-rest/usage/rate-limits)
- [Rate Limiting GraphQL APIs by Calculating Query Complexity](https://shopify.engineering/rate-limiting-graphql-apis-calculating-query-complexity)
