# Phase 04 — Tag Navigator Component

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-core-framework.md)
- PRD: Section 5.3 Component: tag_navigator
- Use Case: UC-03 The Lost Shopper

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 0.5h
- **Description:** Slide-in panel from right edge showing tag-based filter shortcuts. Helps lost shoppers narrow down their search.

## Spec Summary

| Property | Value |
|---|---|
| **Trigger** | back_nav ≥3 + cart empty + session > 3min |
| **Position** | Slide-in panel from right edge, 260px wide |
| **Headline** | "Vẫn đang tìm kiếm? Thử lọc theo:" |
| **Content** | 3-4 tag buttons extracted from viewed products |
| **Tag click** | Navigate to `/collections/all?filter.p.tag=[tag]` |
| **Dismiss** | X button → localStorage persist. Only triggers once per session. |

## Visual Layout

```
                              ┌──────────────────────────┐
                              │ Vẫn đang tìm kiếm?  [X] │
                              │ Thử lọc theo:            │
                              │                          │
                              │  ┌────────────────────┐  │
                              │  │  Áo khoác          │  │
                              │  └────────────────────┘  │
                              │  ┌────────────────────┐  │
                              │  │  Cotton             │  │
                              │  └────────────────────┘  │
                              │  ┌────────────────────┐  │
                              │  │  Mùa đông          │  │
                              │  └────────────────────┘  │
                              │  ┌────────────────────┐  │
                              │  │  Unisex             │  │
                              │  └────────────────────┘  │
                              └──────────────────────────┘
```

**Mobile (375px):** Panel width reduces to 220px. Same vertical layout.

## CSS

```css
.sr-tag-nav {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateX(100%) translateY(-50%);
  width: 260px;
  z-index: 9998;
  padding: 20px;
  border-left: 1px solid rgba(0,0,0,0.08);
  box-shadow: -4px 0 16px rgba(0,0,0,0.08);
  transition: transform 300ms ease;
}
.sr-tag-nav--open {
  transform: translateX(0) translateY(-50%);
}
.sr-tag-nav__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
  padding-right: 28px;
}
.sr-tag-nav__subtitle {
  font-size: 13px;
  opacity: 0.7;
  margin: 0 0 16px 0;
}
.sr-tag-nav__tags {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sr-tag-nav__tag {
  display: block;
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  border: 1px solid rgba(0,0,0,0.12);
  background: transparent;
  color: var(--color-foreground, inherit);
  border-radius: var(--buttons-radius, 4px);
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  text-decoration: none;
}
.sr-tag-nav__tag:hover {
  background: var(--sr-accent, var(--color-button, #000));
  color: var(--color-button-text, #fff);
  border-color: var(--sr-accent, var(--color-button, #000));
}
@media (max-width: 749px) {
  .sr-tag-nav { width: 220px; padding: 16px; }
  .sr-tag-nav__tag { font-size: 13px; padding: 8px 12px; }
}
```

## JavaScript Implementation

```js
function renderTagNavigator(data) {
  if (!data?.tags?.length) return;

  injectStyles(TAG_NAV_CSS);

  const tags = data.tags.slice(0, 4);

  const panel = createElement('div', 'sr-widget sr-tag-nav');
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Gợi ý tìm kiếm');

  const title = createElement('p', 'sr-tag-nav__title');
  title.textContent = 'Vẫn đang tìm kiếm?';

  const subtitle = createElement('p', 'sr-tag-nav__subtitle');
  subtitle.textContent = 'Thử lọc theo:';

  panel.appendChild(title);
  panel.appendChild(subtitle);
  panel.appendChild(createDismissButton('tag_navigator', panel));

  const tagContainer = createElement('div', 'sr-tag-nav__tags');
  tags.forEach(tag => {
    const btn = createElement('a', 'sr-tag-nav__tag', {
      href: '/collections/all?filter.p.tag=' + encodeURIComponent(tag.value)
    });
    btn.textContent = tag.label;
    tagContainer.appendChild(btn);
  });
  panel.appendChild(tagContainer);

  document.body.appendChild(panel);

  // Slide in after short delay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.classList.add('sr-tag-nav--open');
    });
  });
}
```

## Todo List
- [ ] Add TAG_NAV_CSS to widget-renderer.js
- [ ] Implement renderTagNavigator function
- [ ] Test slide-in animation from right edge
- [ ] Test with 3 tags, 4 tags
- [ ] Test tag click navigates to correct filtered collection URL
- [ ] Test dismiss + slide-out animation
- [ ] Test on 375px: 220px width, no overflow

## Success Criteria
- Panel slides in from right edge, 260px wide
- Shows title + subtitle + 3-4 tag buttons
- Tag click navigates to `/collections/all?filter.p.tag=[value]`
- Dismiss slides out + persists in localStorage
- Doesn't block main page content (positioned on right side)
- Mobile: 220px width, all tags visible

## Risk Assessment
- **Panel overlaps mobile nav:** z-index 9998 should appear above, but some themes have nav z-index > 10000. Acceptable — widget is dismissable.
- **URL encoding:** `encodeURIComponent` handles special characters in tag names.
