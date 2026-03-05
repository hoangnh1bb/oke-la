# SmartRec AI Agent Features — Brainstorm Report

**Date:** 2026-03-05
**Focus:** Storefront AI agents for product discovery & CRO
**Constraint:** No `write_theme` scope. Use app embed blocks (merchant toggles on) + existing scopes.

---

## Selected Features (4)

### Feature 1: AI Shopping Concierge (Conversational Product Finder)

**Problem:** Shoppers with vague intent ("gift for dad", "outfit for beach wedding") can't find products via keyword search or category browsing. They leave.

**Solution:** Floating chat widget where shoppers describe what they need in natural language. AI searches store catalog semantically and returns curated product cards.

#### Technical Architecture

```
[Storefront]                    [SmartRec Server]              [AI Layer]
Chat Widget (app embed) ──POST──> /api/concierge ──────────> LLM (Claude/GPT)
  - shopper message              - shop context                - product embeddings
  - session signals              - product vector DB           - intent parsing
  <──JSON── product cards        - conversation state          - result ranking
            + "why" text
```

**Components:**
- **Product Index Pipeline:** On app install, fetch all products via `read_products`. Generate text embeddings (product title + description + tags + type). Store in SQLite with `sqlite-vec` or Upstash Vector. Refresh every 4h via webhook or cron.
- **Chat Widget:** App embed block → injects floating bubble (bottom-right). Vanilla JS, <10KB. Opens into 360px wide panel. Mobile: full-width bottom sheet.
- **Concierge API:** `POST /api/concierge` — receives message + session context. Retrieves top-5 similar products via vector search. Passes to LLM with store context for ranking + explanation generation.
- **Conversation Memory:** localStorage for session continuity. Max 10 messages per conversation. No server-side storage (privacy).

**LLM Prompt Strategy:**
```
System: You are a shopping assistant for {store_name}.
Help shoppers find products from this store's catalog only.
Never recommend products not in the catalog.
Be concise — max 2 sentences per product suggestion.

Context: Store sells {product_types}.
Available products matching query: {top_5_vector_results}
Shopper's browsing session: viewed {recent_products}

User: {shopper_message}
```

**Cost Model:**
- Embedding generation: ~$0.01 per 1000 products (one-time, re-run on catalog change)
- Per conversation turn: ~$0.003 (Claude Haiku) or ~$0.01 (Sonnet)
- Avg 3 turns per conversation → ~$0.01-0.03 per chat session
- At 1000 chat sessions/day → $10-30/day → need to gate behind paid plans

**UX Flow:**
1. Bubble appears after 30s on site (or when intent score indicates browsing/exploring)
2. Tap → opens chat with greeting: "Hi! Tell me what you're looking for and I'll help you find it."
3. Shopper types intent → AI responds with 2-3 product cards + brief reasoning
4. Each card: thumbnail, title, price, "View" button
5. Click "View" → navigates to product page, chat minimizes but persists
6. Dismiss → doesn't re-appear for 24h (localStorage)

**Pricing Gate:**
- Free plan: 20 conversations/mo
- Starter ($14.99): 200 conversations/mo
- Growth ($29.99): 1000 conversations/mo
- Scale ($59.99): Unlimited

**Scopes:** `read_products` (existing)
**New dependencies:** LLM API (Claude/OpenAI), vector storage
**Build estimate:** 8-12h (P2/P3 feature, not MVP)

---

### Feature 2: Smart Product Quiz Agent (Guided Selling)

**Problem:** Lost shoppers (back_nav >= 3, empty cart) need help narrowing down — but tag filters (UC-03) are too generic. A structured quiz converts better.

**Solution:** Auto-generated 3-question quiz that narrows product selection based on store's actual catalog. Zero merchant configuration — AI analyzes product data and creates quiz dynamically.

#### Technical Architecture

```
[Signal Collector] ──triggers──> [Quiz Generator] ──renders──> [Quiz Widget]
  back_nav >= 3                   analyzes catalog               slide-in panel
  cart empty                      generates questions             3 progressive Qs
  session > 3min                  maps answers to filters         shows results
```

**Components:**
- **Quiz Generator (server-side, cached):** Runs on app install + daily refresh. Analyzes store's products to extract:
  - Product types → "What are you looking for?" (e.g., Dresses, Tops, Accessories)
  - Price ranges → "What's your budget?" (auto-bucketed: Under $25, $25-50, $50-100, $100+)
  - Top tags → "Any preferences?" (e.g., Casual, Formal, Cotton, Silk)
  - Output: quiz config JSON stored per-shop
- **Quiz Widget (storefront):** Renders inside existing tag_navigator slot (UC-03 upgrade). 3-step progressive disclosure. Each answer narrows results.
- **Result Ranker:** Filters products by quiz answers. If Intent Engine has session data, boost products similar to what they already viewed. Return top 4 products.

**Quiz Auto-Generation Logic:**
```javascript
async function generateQuizConfig(shopProducts) {
  // Step 1: Extract taxonomy
  const types = countUnique(products, 'product_type'); // top 6
  const priceRanges = computePriceBuckets(products);   // 4 buckets
  const topTags = countUnique(products, 'tags');        // top 8

  // Step 2: Build questions (only if enough variety)
  const questions = [];
  if (types.length >= 3) questions.push({ type: 'category', options: types.slice(0, 6) });
  if (priceRanges.spread > 2) questions.push({ type: 'budget', options: priceRanges });
  if (topTags.length >= 4) questions.push({ type: 'preference', options: topTags.slice(0, 6) });

  // Step 3: Fallback — if < 2 questions possible, disable quiz
  return questions.length >= 2 ? { enabled: true, questions } : { enabled: false };
}
```

**UX Flow:**
1. Lost shopper detected (existing UC-03 trigger)
2. Instead of tag filters → slide-in quiz panel from right (280px)
3. Q1: "What are you looking for?" → product type chips
4. Q2: "What's your budget?" → price range chips
5. Q3: "Any preferences?" → tag chips (multi-select)
6. "Show results" → 4 product cards in same panel
7. Click product → navigate to PDP, quiz dismisses

**Why no LLM needed:**
- Quiz generation is pure data analysis (count types, bucket prices, rank tags)
- No LLM cost → can include in free plan
- Fast: quiz config cached, regenerated daily

**Scopes:** `read_products` (existing)
**New dependencies:** None
**Build estimate:** 4-6h (natural extension of UC-03)

---

### Feature 3: "Why This Product" AI Explainer

**Problem:** When SmartRec recommends an alternative, shopper doesn't understand WHY. Generic "You may also like" creates distrust. Context-aware explanation builds confidence.

**Solution:** Each recommendation card includes a 1-sentence AI-generated explanation: *"This has 4.8★ reviews and is available in your size range — shoppers comparing [current product] often choose this instead."*

#### Technical Architecture

```
[Recommendation Engine] ──product pair──> [Explainer Cache] ──text──> [Widget]
  product A (viewing)                      pre-computed per pair         inline text
  product B (recommended)                  refreshed daily               under card
  session context                          LLM for generation
```

**Components:**
- **Explanation Generator (batch, server-side):** For each product with alternatives, pre-generate explanations using:
  - Price comparison: "Save $15 compared to [current]"
  - Rating comparison: "Rated 0.3★ higher with 2x more reviews"
  - Availability: "Available in all sizes" (if current product has stock issues)
  - Popularity: "Most popular choice in [category]"
  - Substitution data: "67% of shoppers who viewed [A] ended up buying [B]"
- **Template-first, LLM-second:** Use templates for common patterns (cheaper, better rated, etc). Only call LLM for nuanced cases.
- **Cache Layer:** Store explanations in DB keyed by `(product_a_id, product_b_id)`. TTL: 24h. Regenerate on product data change.

**Explanation Templates (no LLM needed):**
```javascript
const templates = {
  cheaper: "Save {diff} compared to what you're viewing",
  betterRated: "Rated {rating}★ with {count} reviews — {delta}★ higher",
  popular: "Most chosen by shoppers who viewed {product_a}",
  sameStyle: "Similar style, different brand — {review_count} happy customers",
  inStock: "All sizes available — ships today",
  substitution: "{pct}% of similar shoppers chose this instead"
};
```

**LLM Enhancement (optional, for paid plans):**
- For Starter+: Use LLM to combine multiple signals into natural sentence
- Input: product A metadata, product B metadata, comparison data
- Output: "This organic cotton tee has the same relaxed fit you're looking at, but with 4.8★ from 340 reviews and free returns."
- Cache aggressively — same explanation serves all shoppers viewing same pair

**UX:**
- Small italic text (12px) directly under each recommended product card
- Color: muted/secondary text color from theme
- No interaction needed — just reads naturally
- Example placement:
  ```
  ┌─────────────────────┐
  │  [Product Image]     │
  │  Blue Linen Shirt    │
  │  $39.99              │
  │  ────────────────    │
  │  Save $12 · 4.9★     │
  │  from 189 reviews    │
  │  [View →]            │
  └─────────────────────┘
  ```

**Cost Model:**
- Template-based: $0 (majority of cases)
- LLM-enhanced: ~$0.001 per explanation (cached, amortized across all shoppers)
- Pre-compute top 100 product pairs per store → covers 80% of traffic

**Scopes:** `read_products`, `read_orders` (existing)
**New dependencies:** LLM API (optional enhancement)
**Build estimate:** 3-4h for template version, +2h for LLM enhancement

---

### Feature 4: Visual Similarity Agent

**Problem:** Product tags are unreliable (merchants tag inconsistently). Text-based "similar products" often miss what shoppers actually see as similar. A blue striped shirt and a blue plaid shirt might share no tags but look very similar to shoppers.

**Solution:** Use AI vision to find visually similar products. Works from Day 1 with zero order data, zero tags. Pure image understanding.

#### Technical Architecture

```
[Product Images] ──embed──> [Vector DB] ──query──> [Similar Products]
  via read_products          CLIP embeddings         nearest neighbors
  on install + daily         SQLite-vec / Upstash    top 4 results
```

**Components:**
- **Image Embedding Pipeline:**
  - On app install: fetch all product featured images via `read_products`
  - Generate CLIP embeddings (768-dim vector per image)
  - Options: OpenAI Embeddings API, or self-hosted CLIP model
  - Store in vector DB (SQLite-vec for MVP, Upstash Vector for scale)
  - Re-index: daily cron or product webhook trigger
- **Similarity Query:**
  - Shopper views product → fetch product's embedding → find 4 nearest neighbors
  - Exclude same product, exclude out-of-stock
  - Return product IDs → resolve to full product data
- **Widget:** "Visually similar" horizontal scroll carousel on product page

**Embedding Cost Model:**
- OpenAI CLIP: ~$0.0001 per image
- Store with 500 products → $0.05 one-time, $0.05/day if re-indexing daily
- Query: vector similarity search is free (local computation)
- Total: ~$1.50/month for 500-product store with daily re-index

**Self-hosted Alternative:**
- Use `@xenova/transformers` (ONNX runtime in Node.js) for CLIP embeddings
- Zero API cost, runs on your server
- ~200ms per image embedding on standard VPS
- 500 products = ~100s initial indexing, then incremental

**UX Flow:**
1. Shopper on product page
2. Below "You may also like" section (or integrated into SmartRec's alternative_nudge)
3. "Visually similar" label + 4 product cards in horizontal scroll
4. Each card: image, title, price
5. Only shows if visual similarity score > threshold (avoid showing unrelated products)

**Integration with SmartRec:**
- Can replace or complement tag-based alternatives in UC-01
- When intent score 56-75 (hesitating): show visual alternatives instead of tag-based
- Hybrid ranking: 0.6 × visual_similarity + 0.4 × tag_overlap → best of both

**Scopes:** `read_products` (existing)
**New dependencies:** CLIP model or OpenAI Embeddings API, vector storage
**Build estimate:** 6-8h (embedding pipeline + vector search + widget)

---

## Implementation Priority & Phasing

### Phase 1 (MVP v1) — Ship with core SmartRec
- **#3 "Why This" Explainer (template version)** — 3h, zero new dependencies, enhances existing recommendations immediately

### Phase 2 (v1.1) — First AI features
- **#2 Smart Quiz Agent** — 4-6h, no LLM needed, upgrades UC-03
- **#3 LLM enhancement** for explainer — 2h, add natural language explanations

### Phase 3 (v2.0) — Differentiator features
- **#1 AI Shopping Concierge** — 8-12h, needs LLM API, vector DB, biggest differentiator
- **#4 Visual Similarity** — 6-8h, needs image embedding pipeline

### Shared Infrastructure (build once, use everywhere)
| Component | Used by | Build once |
|-----------|---------|------------|
| Product text embeddings | #1 Concierge, #3 Explainer | Vector DB setup |
| Product image embeddings | #4 Visual Similarity | CLIP pipeline |
| LLM integration layer | #1 Concierge, #3 Explainer (enhanced) | API wrapper + caching |
| App embed block scaffold | All storefront features | Theme extension setup |

---

## Pricing Impact

| Feature | Free | Starter ($14.99) | Growth ($29.99) | Scale ($59.99) |
|---------|------|-------------------|-----------------|----------------|
| Why This Explainer | Template only | + LLM enhanced | + LLM enhanced | + LLM enhanced |
| Smart Quiz | Yes | Yes | Yes | Yes |
| AI Concierge | 20 chats/mo | 200 chats/mo | 1000 chats/mo | Unlimited |
| Visual Similarity | No | Top 3 similar | Top 6 similar | Top 6 + cross-sell |

**Estimated LLM cost per merchant per month:**
- Starter: ~$0.50 (low usage)
- Growth: ~$3.00 (medium usage)
- Scale: ~$8.00 (high usage)
- Margin remains strong at all tiers.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM costs exceed margin on free tier | Medium | Gate AI features behind paid plans; template-only for free |
| LLM hallucination (recommends non-existent product) | High | Only recommend products from vector search results; never let LLM generate product names |
| Slow response time (chat widget) | Medium | Stream responses; use Haiku for speed; pre-compute common queries |
| Image embedding quality varies by product photo quality | Low | Fallback to tag-based similarity when visual score is low |
| App Store review: script tags vs app embed blocks | High | Use theme app extensions (app embed blocks) from Day 1; skip script tags entirely |

---

## Key Decision: Script Tags vs App Embed Blocks

**Recommendation: Use App Embed Blocks from Day 1**

| Aspect | Script Tags | App Embed Blocks |
|--------|-------------|-----------------|
| App Store approval | Risky — legacy, may get flagged | Recommended path |
| `write_theme` needed? | No (write_script_tags) | No (merchant toggles on) |
| Works on all themes? | Yes (including vintage) | OS 2.0 themes only (~90% of active stores) |
| CDN caching | Optional proxy | Shopify CDN by default |
| Merchant control | None (auto-injected) | Toggle on/off in theme editor |
| Uninstall cleanup | Automatic | Automatic |

**Trade-off:** Lose ~10% of stores on vintage themes. Gain App Store compliance and better merchant experience. Worth it.

---

## Unresolved Questions
1. **LLM provider choice:** Claude API vs OpenAI? Claude Haiku is cheaper for chat; OpenAI has better embedding ecosystem. Could use both.
2. **Vector DB:** SQLite-vec (zero infra, bundled with app) vs Upstash Vector (managed, scales better)? Recommend SQLite-vec for MVP, migrate when needed.
3. **Rate limiting strategy** for AI Concierge on free tier — per-shop monthly cap vs per-session cap?
4. **Image embedding model:** CLIP via OpenAI API vs self-hosted `@xenova/transformers`? Self-hosted = zero cost but slower initial indexing.
