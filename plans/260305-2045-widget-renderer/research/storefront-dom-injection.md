# Research: Storefront DOM Injection for Shopify Widgets
**Date:** 2026-03-05 | **Scope:** Widget Renderer storefront injection strategy

---

## 1. Injection Method: Theme App Extension (App Embed Block)

**Decision:** Use App Embed Block (`target: body`), confirmed from Foundation plan research.

App Embed Blocks inject before `</body>` on every page. SmartRec loads two JS files:
- `smartrec-signal-collector.js` — behavioral tracking
- `smartrec-widget-renderer.js` — UI component rendering

JS files are served from Shopify CDN (`{{ 'file.js' | asset_url | script_tag }}`). No external hosting. No CORS.

### Why NOT Script Tags API
- Deprecated in favor of theme app extensions
- Script Tags require `write_script_tags` scope
- No merchant control (auto-inject on all pages)
- Theme extensions give merchant toggle via Theme Editor

### Why NOT App Blocks (section-based)
- App Blocks require merchant to manually place them in sections
- Not suitable for global widgets (comparison bar, tag navigator)
- Limited to Online Store 2.0 JSON templates — excludes vintage themes
- App Embed Blocks work on ALL themes

## 2. CSS Strategy: Theme Variable Inheritance

### Dawn Theme CSS Variables (v15+)
```css
--font-body-family           /* Body font */
--font-heading-family        /* Heading font */
--color-foreground           /* Primary text color */
--color-background           /* Page background */
--color-button               /* Button/accent color */
--color-button-text          /* Button text color */
--buttons-radius             /* Border radius */
```

### Dawn Legacy Variables (v1-v14)
```css
--font-family                /* Body font */
--color-base-text            /* Text color */
--color-base-background-1    /* Background */
--color-base-accent-1        /* Accent color */
```

### Fallback Strategy
```css
.sr-widget {
  /* Try new → try old → safe default */
  font-family: var(--font-body-family, var(--font-family, inherit));
  color: var(--color-foreground, var(--color-base-text, inherit));
  background: var(--color-background, var(--color-base-background-1, #fff));
}
```

Using `inherit` as final fallback ensures widgets match parent element styling even on non-Dawn themes.

## 3. DOM Injection Patterns

### Product Page Anchors
Shopify themes use varied selectors for product description and ATC:

| Theme | Description selector | ATC selector |
|---|---|---|
| Dawn | `.product__description` | `form[action="/cart/add"]` |
| Debut | `.product-single__description` | `.product-form` |
| Supply | `.product-description` | `.product-form` |
| Custom | `[data-product-description]` | `[data-product-form]` |

**Strategy:** Try ordered list of selectors. If all fail, append to `main` or `#MainContent`.

### Cart Page Anchors
Even more varied:

| Theme | Cart items selector | Checkout btn selector |
|---|---|---|
| Dawn | `.cart__items` | `button[name="checkout"]` |
| Debut | `.cart__row` | `.cart__submit` |
| Custom | `[data-cart-items]` | `form[action="/cart"] button` |

### Insertion Methods
- `insertAdjacentElement('afterend', widget)` — insert after anchor (product desc, cart items)
- `document.body.appendChild(widget)` — fixed position elements (comparison bar, tag nav)

## 4. Performance Considerations

- **No layout shift:** Widgets use `opacity: 0 → 1` transition. No height/transform that causes CLS.
- **Lazy images:** All product images use `loading="lazy"`.
- **Single style injection:** Each component's CSS injected once via `<style>` tag, not inline styles.
- **No framework:** Vanilla JS. No React, Preact, or libraries. Target < 8KB gzipped.

## 5. Namespace Isolation

All CSS classes prefixed `sr-` to avoid collisions:
- `sr-widget` (base)
- `sr-alt-nudge`, `sr-compare-bar`, `sr-tag-nav`, `sr-trust-nudge` (components)
- `sr-dismiss` (shared dismiss button)

No global CSS overrides. No `!important`. Component CSS scoped by class prefix.

---

## Key Decisions

1. **Vanilla JS IIFE** — no build step, no framework, CDN-served
2. **CSS variable fallback chain** — Dawn v15+ → Dawn legacy → `inherit`/safe defaults
3. **Ordered selector fallback** — try 6+ selectors per anchor point, graceful degradation
4. **Opacity-only animation** — no CLS, no scale, no bounce
5. **sr- prefix namespace** — zero collision risk with theme CSS
