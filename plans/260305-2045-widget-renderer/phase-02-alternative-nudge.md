# Phase 02 — Alternative Nudge Component

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-core-framework.md)
- PRD: Section 5.1 Component: alternative_nudge
- Use Case: UC-01 The Hesitating Shopper

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1h
- **Description:** Inline widget showing 2 alternative products when shopper hesitates on a product page. Appears below product description, above add-to-cart.

## Spec Summary

| Property | Value |
|---|---|
| **Trigger** | Intent score 56-75 + hesitation signals (size_chart_open, review_hover) |
| **Position** | Inline, below `.product-description`, above ATC form |
| **Headline** | "Không chắc chắn? Khách hàng tương tự cũng xem những sản phẩm này." |
| **Content** | Max 2 product cards: image 80x80, title (1 line truncated), price, "View" button |
| **Animation** | Fade-in 300ms after 3s delay from trigger |
| **Dismiss** | X button top-right → localStorage persist → no re-show in session |

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Không chắc chắn? Khách hàng tương tự cũng xem...    [X]   │
│                                                             │
│  ┌──────┐ Tên sản phẩm dài sẽ bị cắt...  350.000₫         │
│  │ IMG  │                                  [Xem ➜]         │
│  │80x80 │                                                   │
│  └──────┘                                                   │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  ┌──────┐ Tên sản phẩm thứ hai            420.000₫         │
│  │ IMG  │                                  [Xem ➜]         │
│  │80x80 │                                                   │
│  └──────┘                                                   │
└─────────────────────────────────────────────────────────────┘
```

**Mobile (375px):** Same layout. Image shrinks to 64x64. Font 13px.

## CSS

```css
.sr-alt-nudge {
  position: relative;
  padding: 16px;
  margin: 16px 0;
  border: 1px solid rgba(0,0,0,0.08);
}
.sr-alt-nudge__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  padding-right: 32px; /* space for dismiss btn */
  color: var(--color-foreground, inherit);
}
.sr-alt-nudge__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.sr-alt-nudge__item + .sr-alt-nudge__item {
  border-top: 1px solid rgba(0,0,0,0.06);
}
.sr-alt-nudge__img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--buttons-radius, 4px);
  flex-shrink: 0;
}
.sr-alt-nudge__info {
  flex: 1;
  min-width: 0;
}
.sr-alt-nudge__name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 4px 0;
}
.sr-alt-nudge__price {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
}
.sr-alt-nudge__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--sr-accent, var(--color-button, #000));
  color: var(--sr-accent, var(--color-button, #000));
  background: transparent;
  border-radius: var(--buttons-radius, 4px);
  cursor: pointer;
  text-decoration: none;
  transition: background 150ms, color 150ms;
}
.sr-alt-nudge__btn:hover {
  background: var(--sr-accent, var(--color-button, #000));
  color: var(--color-button-text, #fff);
}
@media (max-width: 749px) {
  .sr-alt-nudge__img { width: 64px; height: 64px; }
  .sr-alt-nudge__name, .sr-alt-nudge__price { font-size: 13px; }
}
```

## JavaScript Implementation

```js
function renderAlternativeNudge(data) {
  if (!data?.products?.length) return;
  const anchor = findProductDescriptionAnchor();
  if (!anchor) return;

  const products = data.products.slice(0, 2);

  // Inject component CSS
  injectStyles(ALT_NUDGE_CSS);

  // Build container
  const container = createElement('div', 'sr-widget sr-alt-nudge');
  container.setAttribute('role', 'complementary');
  container.setAttribute('aria-label', 'Gợi ý sản phẩm');

  // Title
  const title = createElement('p', 'sr-alt-nudge__title');
  title.textContent = 'Không chắc chắn? Khách hàng tương tự cũng xem những sản phẩm này.';
  container.appendChild(title);

  // Dismiss button
  container.appendChild(createDismissButton('alternative_nudge', container));

  // Product cards
  products.forEach(product => {
    const item = createElement('div', 'sr-alt-nudge__item');

    const img = createElement('img', 'sr-alt-nudge__img', {
      src: product.image_url,
      alt: product.title,
      loading: 'lazy',
      width: '80',
      height: '80'
    });

    const info = createElement('div', 'sr-alt-nudge__info');

    const name = createElement('p', 'sr-alt-nudge__name');
    name.textContent = product.title;

    const price = createElement('p', 'sr-alt-nudge__price');
    price.textContent = product.price;

    const btn = createElement('a', 'sr-alt-nudge__btn', {
      href: product.url
    });
    btn.textContent = 'Xem';
    btn.innerHTML += ' &#8250;';

    info.appendChild(name);
    info.appendChild(price);
    info.appendChild(btn);
    item.appendChild(img);
    item.appendChild(info);
    container.appendChild(item);
  });

  // Insert after anchor element
  anchor.insertAdjacentElement('afterend', container);

  // Fade in with delay
  fadeIn(container, NUDGE_DELAY);
}
```

## Todo List
- [ ] Add ALT_NUDGE_CSS string to widget-renderer.js
- [ ] Implement renderAlternativeNudge function
- [ ] Test on Dawn theme — verify position below description
- [ ] Test with 1 product, 2 products
- [ ] Test dismiss → reload → no re-show
- [ ] Test on 375px mobile — no overflow, image 64px
- [ ] Test "View" button navigation to product URL
- [ ] Verify fade-in with 3s delay

## Success Criteria
- Component visible below product description on Dawn product page
- Max 2 product cards with correct data
- Fade-in after 3s, 300ms opacity transition
- Dismiss works and persists across page loads
- Mobile: no horizontal overflow on 375px
- Title text matches spec exactly

## Risk Assessment
- **Anchor not found:** If no product description element found, component simply doesn't render. Acceptable graceful degradation.
- **Image URL formatting:** Depends on Intent Engine returning CDN-ready URLs. If raw URL, may need `_160x160_crop_center` suffix appended.
