# Phase 06 — Mobile Optimization & Polish

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: All previous phases

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 0.5h
- **Description:** Final pass — mobile testing, cross-theme validation, performance check, edge cases.

## Checklist

### Mobile (375px — iPhone SE)
- [ ] alternative_nudge: image 64x64, text doesn't overflow, "View" button reachable
- [ ] comparison_bar: diff points hidden, name truncated, "So sánh" button reachable
- [ ] comparison_panel: products stack vertically, images scale properly
- [ ] tag_navigator: 220px width, doesn't cover full screen, tags wrap if long
- [ ] trust_nudge: badge wraps to next line, stars visible
- [ ] All dismiss buttons: tappable (min 44x44px touch target)
- [ ] No horizontal scrollbar on any page with widgets

### Cross-Theme Testing
- [ ] Dawn (latest) — primary test target
- [ ] Dawn (vintage/non-JSON) — app embed still works
- [ ] Test with custom theme if available
- [ ] Verify CSS variables fall back correctly when theme doesn't define them

### Performance
- [ ] widget-renderer.js total size < 8KB gzipped (excluding signal-collector)
- [ ] No layout shift (CLS) when widgets inject — use opacity fade, not height animation
- [ ] Images use `loading="lazy"` attribute
- [ ] No render-blocking — script loaded via theme app extension (async by default)

### Edge Cases
- [ ] renderAction called with unknown type → no crash, silent return
- [ ] renderAction called with null/undefined data → no crash
- [ ] Multiple renderAction calls for same type → only one instance rendered
- [ ] Product with very long title (100+ chars) → truncated with ellipsis
- [ ] Product with no image → show placeholder or skip image
- [ ] Cart page with 0 items → trust_nudge doesn't render
- [ ] Cart page with 10+ items → trust_nudge scrollable or max 5 items shown
- [ ] Tag with special characters (é, ñ, spaces) → URL-encoded correctly

### Accessibility
- [ ] All interactive elements keyboard-focusable
- [ ] Dismiss buttons have `aria-label="Đóng"`
- [ ] Widget containers have `role="complementary"` + `aria-label`
- [ ] Color contrast ratio ≥ 4.5:1 for text (inherited from theme)
- [ ] Star ratings: add `aria-label` with numeric value

### Implementation

#### Deduplication Guard
```js
// Add to each render function at the top:
function renderAlternativeNudge(data) {
  if (document.querySelector('.sr-alt-nudge')) return; // already rendered
  // ... rest of function
}
```

#### No-Image Fallback
```js
function productImageOrPlaceholder(url, alt) {
  if (!url) {
    const placeholder = createElement('div', 'sr-img-placeholder');
    placeholder.textContent = alt?.charAt(0) || '?';
    return placeholder;
  }
  return createElement('img', '', { src: url, alt: alt || '', loading: 'lazy' });
}
```

#### Accessibility Stars
```js
function renderStars(rating, container) {
  const full = Math.round(rating);
  const stars = createElement('span', 'sr-trust-nudge__stars', {
    'aria-label': rating + ' trên 5 sao',
    role: 'img'
  });
  stars.textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
  container.appendChild(stars);
}
```

## Success Criteria
- All 4 components render correctly on 375px without overflow
- All 4 components render correctly on Dawn theme
- No console errors from widget-renderer.js
- File size under budget
- No layout shift visible
- Keyboard navigation works for all interactive elements

## Final Deliverable
One complete `smartrec-widget-renderer.js` file in `extensions/smartrec-theme-ext/assets/` containing:
1. IIFE wrapper with checkout guard
2. DismissManager
3. DOM utilities (createElement, injectStyles, fadeIn, createDismissButton)
4. DOM anchor finders
5. Shared base CSS
6. Component-specific CSS (4 sets)
7. renderAlternativeNudge()
8. renderComparisonBar()
9. renderTagNavigator()
10. renderTrustNudge()
11. window.SmartRecRender dispatcher
