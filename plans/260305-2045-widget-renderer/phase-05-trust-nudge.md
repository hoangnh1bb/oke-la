# Phase 05 — Trust Nudge Component

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-core-framework.md)
- PRD: Section 5.4 Component: trust_nudge
- Use Case: UC-04 The Cart Doubt Shopper

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 0.5h
- **Description:** Inline trust/reassurance signals shown below cart items when shopper hesitates on cart page. Shows rating, review count, and return policy per product in cart. No headline, no pressure tactics.

## Spec Summary

| Property | Value |
|---|---|
| **Trigger** | cart_hesitation > 60s on /cart page without checkout click |
| **Position** | Inline below cart items, above checkout button |
| **Content** | Per cart item: star rating + review count + "Đổi trả miễn phí" badge if applicable |
| **No headline** | No title — just contextual trust info |
| **No pressure** | No countdown, no "Only X left", no scarcity |
| **Dismiss** | X button → localStorage persist |

## Visual Layout

```
┌────────────────────────────────────────────────────────────────────┐
│                                                              [X]  │
│  Áo khoác gió nam                                                 │
│  ★★★★☆  234 đánh giá  ·  🔄 Đổi trả miễn phí 30 ngày           │
│                                                                    │
│  Quần jeans slim fit                                               │
│  ★★★★★  89 đánh giá                                              │
└────────────────────────────────────────────────────────────────────┘
```

**Mobile (375px):** Full width. Badge wraps to next line if needed. Font 13px.

## CSS

```css
.sr-trust-nudge {
  position: relative;
  padding: 12px 16px;
  margin: 12px 0;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: var(--buttons-radius, 4px);
}
.sr-trust-nudge__item {
  padding: 8px 0;
}
.sr-trust-nudge__item + .sr-trust-nudge__item {
  border-top: 1px solid rgba(0,0,0,0.06);
}
.sr-trust-nudge__product-name {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 4px 0;
  padding-right: 28px;
}
.sr-trust-nudge__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.sr-trust-nudge__stars {
  color: #f59e0b;
  letter-spacing: 1px;
}
.sr-trust-nudge__reviews {
  opacity: 0.7;
}
.sr-trust-nudge__separator {
  opacity: 0.3;
}
.sr-trust-nudge__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-radius: 99px;
}
@media (max-width: 749px) {
  .sr-trust-nudge__product-name { font-size: 12px; }
  .sr-trust-nudge__meta { font-size: 12px; }
}
```

## JavaScript Implementation

```js
function renderTrustNudge(data) {
  if (!data?.items?.length) return;
  const anchor = findCartItemsAnchor();
  if (!anchor) return;

  injectStyles(TRUST_CSS);

  const container = createElement('div', 'sr-widget sr-trust-nudge');
  container.setAttribute('role', 'complementary');
  container.setAttribute('aria-label', 'Thông tin sản phẩm');

  container.appendChild(createDismissButton('trust_nudge', container));

  data.items.forEach(item => {
    const row = createElement('div', 'sr-trust-nudge__item');

    const name = createElement('p', 'sr-trust-nudge__product-name');
    name.textContent = item.title;

    const meta = createElement('div', 'sr-trust-nudge__meta');

    if (item.rating) {
      const stars = createElement('span', 'sr-trust-nudge__stars');
      const full = Math.round(item.rating);
      stars.textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
      meta.appendChild(stars);
    }

    if (item.review_count > 0) {
      const reviews = createElement('span', 'sr-trust-nudge__reviews');
      reviews.textContent = item.review_count + ' đánh giá';
      meta.appendChild(reviews);
    }

    if (item.has_free_return) {
      if (meta.children.length > 0) {
        const sep = createElement('span', 'sr-trust-nudge__separator');
        sep.textContent = '·';
        meta.appendChild(sep);
      }
      const badge = createElement('span', 'sr-trust-nudge__badge');
      badge.textContent = '🔄 Đổi trả miễn phí 30 ngày';
      meta.appendChild(badge);
    }

    row.appendChild(name);
    row.appendChild(meta);
    container.appendChild(row);
  });

  // Insert after cart items
  anchor.insertAdjacentElement('afterend', container);
  fadeIn(container, 0);
}
```

## Todo List
- [ ] Add TRUST_CSS to widget-renderer.js
- [ ] Implement renderTrustNudge function
- [ ] Test on cart page with 1 item, 2 items, 3 items
- [ ] Test with/without rating, with/without free return badge
- [ ] Test dismiss persists
- [ ] Test on 375px: badge wraps, no overflow

## Success Criteria
- Component appears below cart items on /cart page
- Shows product name, star rating, review count per item
- "Đổi trả miễn phí" badge only when `has_free_return = true`
- No title/headline — just trust data
- Fade-in 300ms
- Dismiss works and persists

## Risk Assessment
- **Cart page DOM variety:** Cart page structure varies widely across themes. `findCartItemsAnchor()` uses 6 fallback selectors. If none match, component doesn't render (graceful degradation).
- **No rating data:** If `rating` is null and `review_count` is 0, item row only shows product name — still useful as anchor for return policy badge.
