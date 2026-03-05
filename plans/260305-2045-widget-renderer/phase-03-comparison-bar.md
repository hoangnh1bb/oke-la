# Phase 03 — Comparison Bar Component

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-core-framework.md)
- PRD: Section 5.2 Component: comparison_bar
- Use Case: UC-02 The Comparison Shopper

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1h
- **Description:** Thin sticky bar at bottom of viewport showing the other product a shopper is comparing. Expands into a slide-up comparison panel on "So sánh" click.

## Spec Summary

| Property | Value |
|---|---|
| **Trigger** | compare_pattern signal: ≥2 products of same type viewed in session |
| **Position** | Fixed bottom, full width, 60px height |
| **Content** | Previous product thumbnail + truncated name + 2 diff points + "So sánh" button |
| **Expanded** | Slide-up panel: side-by-side product comparison (image, title, price, rating, reviews) |
| **Dismiss** | X button → localStorage persist |

## Visual Layout

### Collapsed Bar (60px)
```
┌─────────────────────────────────────────────────────────────────────┐
│ [IMG] Áo khoác gió nam...  · Rẻ hơn 50k · Rating +0.3★  [So sánh] [X] │
└─────────────────────────────────────────────────────────────────────┘
```

### Expanded Panel (slide-up ~400px)
```
┌─────────────────────────────────────────────────────────────────────┐
│  So sánh sản phẩm                                            [X]  │
│ ┌──────────────────────────┐ ┌──────────────────────────────┐      │
│ │       [IMAGE A]          │ │        [IMAGE B]             │      │
│ │   Áo khoác gió nam      │ │   Áo khoác Bomber           │      │
│ │   350.000₫               │ │   400.000₫                  │      │
│ │   ★★★★☆ (234 reviews)   │ │   ★★★★★ (89 reviews)       │      │
│ │   [Xem sản phẩm]        │ │   [Xem sản phẩm]           │      │
│ └──────────────────────────┘ └──────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

**Mobile (375px):** Collapsed bar text truncates more. Expanded panel is full-width, products stacked vertically.

## CSS

```css
/* Collapsed bar */
.sr-compare-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-top: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
}
.sr-compare-bar__thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--buttons-radius, 4px);
  object-fit: cover;
  flex-shrink: 0;
}
.sr-compare-bar__name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
.sr-compare-bar__diffs {
  display: flex;
  gap: 8px;
  font-size: 12px;
  opacity: 0.7;
  flex-shrink: 0;
}
.sr-compare-bar__diff {
  white-space: nowrap;
}
.sr-compare-bar__diff::before {
  content: '·';
  margin-right: 4px;
}
.sr-compare-bar__cta {
  margin-left: auto;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  background: var(--sr-accent, var(--color-button, #000));
  color: var(--color-button-text, #fff);
  border: none;
  border-radius: var(--buttons-radius, 4px);
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 150ms;
}
.sr-compare-bar__cta:hover { opacity: 0.85; }

/* Expanded panel */
.sr-compare-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  z-index: 9999;
  padding: 24px;
  border-top: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
  transform: translateY(100%);
  transition: transform 300ms ease;
  overflow-y: auto;
}
.sr-compare-panel--open {
  transform: translateY(0);
}
.sr-compare-panel__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding-right: 32px;
}
.sr-compare-panel__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.sr-compare-panel__product {
  text-align: center;
}
.sr-compare-panel__img {
  width: 100%;
  max-width: 200px;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--buttons-radius, 4px);
  margin: 0 auto 12px;
}
.sr-compare-panel__name {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px;
}
.sr-compare-panel__price {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 8px;
}
.sr-compare-panel__rating {
  font-size: 13px;
  margin: 0 0 12px;
  opacity: 0.7;
}
.sr-compare-panel__link {
  display: inline-block;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--sr-accent, var(--color-button, #000));
  color: var(--sr-accent, var(--color-button, #000));
  border-radius: var(--buttons-radius, 4px);
  transition: background 150ms, color 150ms;
}
.sr-compare-panel__link:hover {
  background: var(--sr-accent, var(--color-button, #000));
  color: var(--color-button-text, #fff);
}
@media (max-width: 749px) {
  .sr-compare-bar__diffs { display: none; }
  .sr-compare-bar__name { max-width: 100px; }
  .sr-compare-panel__grid { grid-template-columns: 1fr; }
  .sr-compare-panel { padding: 16px; }
}
```

## JavaScript Implementation

```js
function renderComparisonBar(data) {
  if (!data?.productA || !data?.productB) return;

  injectStyles(COMPARE_CSS);

  // --- Collapsed Bar ---
  const bar = createElement('div', 'sr-widget sr-compare-bar');

  const thumb = createElement('img', 'sr-compare-bar__thumb', {
    src: data.productA.image_url,
    alt: data.productA.title,
    width: '40', height: '40', loading: 'lazy'
  });

  const name = createElement('span', 'sr-compare-bar__name');
  name.textContent = data.productA.title;

  const diffs = createElement('span', 'sr-compare-bar__diffs');
  (data.diff_points || []).slice(0, 2).forEach(point => {
    const d = createElement('span', 'sr-compare-bar__diff');
    d.textContent = point;
    diffs.appendChild(d);
  });

  const cta = createElement('button', 'sr-compare-bar__cta', { type: 'button' });
  cta.textContent = 'So sánh';

  bar.appendChild(thumb);
  bar.appendChild(name);
  bar.appendChild(diffs);
  bar.appendChild(cta);
  bar.appendChild(createDismissButton('comparison_bar', bar));

  document.body.appendChild(bar);
  fadeIn(bar, 0);

  // --- Expanded Panel ---
  const panel = createElement('div', 'sr-widget sr-compare-panel');
  const panelTitle = createElement('p', 'sr-compare-panel__title');
  panelTitle.textContent = 'So sánh sản phẩm';
  panel.appendChild(panelTitle);
  panel.appendChild(createDismissButton('comparison_bar', bar)); // dismiss both

  const grid = createElement('div', 'sr-compare-panel__grid');
  [data.productA, data.productB].forEach(product => {
    const card = createElement('div', 'sr-compare-panel__product');

    const img = createElement('img', 'sr-compare-panel__img', {
      src: product.image_url, alt: product.title,
      loading: 'lazy'
    });
    const pName = createElement('p', 'sr-compare-panel__name');
    pName.textContent = product.title;
    const pPrice = createElement('p', 'sr-compare-panel__price');
    pPrice.textContent = product.price;
    const pRating = createElement('p', 'sr-compare-panel__rating');
    pRating.textContent = product.rating
      ? `${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5 - Math.round(product.rating))} (${product.review_count} reviews)`
      : `${product.review_count} reviews`;
    const link = createElement('a', 'sr-compare-panel__link', { href: product.url });
    link.textContent = 'Xem sản phẩm';

    card.appendChild(img);
    card.appendChild(pName);
    card.appendChild(pPrice);
    card.appendChild(pRating);
    card.appendChild(link);
    grid.appendChild(card);
  });

  panel.appendChild(grid);
  document.body.appendChild(panel);

  // Toggle expand/collapse
  let expanded = false;
  cta.addEventListener('click', () => {
    expanded = !expanded;
    panel.classList.toggle('sr-compare-panel--open', expanded);
    bar.style.display = expanded ? 'none' : 'flex';
  });

  // Panel dismiss also removes bar
  panel.querySelector('.sr-dismiss').addEventListener('click', () => {
    DismissManager.dismiss('comparison_bar');
    panel.remove();
    bar.remove();
  });
}
```

## Todo List
- [ ] Add COMPARE_CSS to widget-renderer.js
- [ ] Implement renderComparisonBar function
- [ ] Test collapsed bar: fixed bottom, 60px, doesn't cover page content
- [ ] Test diff_points display (0, 1, 2 points)
- [ ] Test "So sánh" button expands panel with slide-up animation
- [ ] Test side-by-side comparison with both products
- [ ] Test dismiss removes both bar and panel
- [ ] Test on 375px: diffs hidden, panel stacks vertically

## Success Criteria
- Bar fixed at bottom viewport, 60px height
- Shows product A thumbnail + name + diff points
- "So sánh" click slides up comparison panel
- Side-by-side product comparison in panel
- Dismiss removes everything + persists
- Mobile: diffs hidden, panel single-column

## Risk Assessment
- **Page has existing sticky footer:** z-index 9998 should overlay most theme elements. If conflict, merchant can disable widget.
- **Scroll padding:** Bar may cover bottom content. Could add `body { padding-bottom: 60px }` but that's intrusive. Accepted tradeoff — bar is dismissable.
