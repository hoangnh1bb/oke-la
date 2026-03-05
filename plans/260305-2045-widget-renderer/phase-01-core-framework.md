# Phase 01 — Core Framework & Shared Utilities

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: Foundation [Phase 02](../260305-1643-smartrec-foundation/phase-02-theme-app-extension-scaffold.md)
- PRD: Section 5.5 Design Principles

## Overview
- **Priority:** P1 — All 4 components depend on this
- **Status:** pending
- **Effort:** 1h
- **Description:** Build the widget renderer core: action dispatcher, shared CSS reset, DOM injection utilities, dismiss/session manager, theme variable detection, and checkout page guard.

## File

**Replace stub:** `extensions/smartrec-theme-ext/assets/smartrec-widget-renderer.js`

Single IIFE file. No build step. Vanilla JS. Target < 8KB gzipped (renderer portion).

## Implementation

### 1. Entry Point & Checkout Guard

```js
(function SmartRecWidgets() {
  'use strict';

  if (!window.SmartRecMeta) return;
  if (/\/checkout/i.test(window.location.pathname)) return;

  const META = window.SmartRecMeta;
  const STORAGE_KEY = 'sr_dismissed';
  const ANIM_DURATION = 300;
  const NUDGE_DELAY = 3000;
```

### 2. Dismiss Manager

```js
  const DismissManager = {
    _cache: null,

    _load() {
      if (this._cache) return this._cache;
      try {
        this._cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch {
        this._cache = {};
      }
      return this._cache;
    },

    isDismissed(widgetType) {
      return !!this._load()[widgetType];
    },

    dismiss(widgetType) {
      const data = this._load();
      data[widgetType] = Date.now();
      this._cache = data;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch { /* quota exceeded — silent fail */ }
    }
  };
```

### 3. DOM Utilities

```js
  function createElement(tag, className, attrs) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function injectStyles(css) {
    const style = createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return style;
  }

  function fadeIn(el, delay) {
    el.style.opacity = '0';
    el.style.transition = `opacity ${ANIM_DURATION}ms ease`;
    setTimeout(() => { el.style.opacity = '1'; }, delay || 0);
  }

  function createDismissButton(widgetType, container) {
    const btn = createElement('button', 'sr-dismiss', {
      'aria-label': 'Đóng',
      type: 'button'
    });
    btn.innerHTML = '&#x2715;';
    btn.addEventListener('click', () => {
      DismissManager.dismiss(widgetType);
      container.style.opacity = '0';
      setTimeout(() => container.remove(), ANIM_DURATION);
    });
    return btn;
  }
```

### 4. DOM Anchor Finders

```js
  // Product page: find injection point below description, above ATC
  function findProductDescriptionAnchor() {
    const selectors = [
      '.product__description',
      '.product-single__description',
      '[data-product-description]',
      '.product__info-container .rte',
      '.product-description',
      '.product__content .rte',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // Fallback: insert before first add-to-cart form
    const atcForm = document.querySelector(
      'form[action="/cart/add"], .product-form, [data-product-form]'
    );
    return atcForm ? atcForm.previousElementSibling || atcForm.parentElement : null;
  }

  // Cart page: find injection point below cart items, above checkout
  function findCartItemsAnchor() {
    const selectors = [
      '.cart__items',
      '.cart-items',
      '[data-cart-items]',
      '.cart__contents',
      'form[action="/cart"] table',
      'form[action="/cart"] .cart-item',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
```

### 5. Shared CSS

```js
  const BASE_CSS = `
    .sr-widget {
      font-family: var(--font-body-family, var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif));
      color: var(--color-foreground, var(--color-base-text, inherit));
      background: var(--color-background, var(--color-base-background-1, #fff));
      border-radius: var(--buttons-radius, 4px);
      box-sizing: border-box;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .sr-widget *, .sr-widget *::before, .sr-widget *::after {
      box-sizing: border-box;
    }
    .sr-dismiss {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--color-foreground, inherit);
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      z-index: 10;
      border-radius: 50%;
      transition: opacity 150ms, background 150ms;
    }
    .sr-dismiss:hover {
      opacity: 1;
      background: rgba(0,0,0,0.05);
    }
    .sr-widget a {
      color: inherit;
      text-decoration: none;
    }
    .sr-widget img {
      display: block;
      max-width: 100%;
      height: auto;
    }
    @media (max-width: 749px) {
      .sr-widget { font-size: 14px; }
    }
  `;
```

### 6. Action Dispatcher

```js
  // Exposed globally for signal-collector.js to call
  window.SmartRecRender = function renderAction(action) {
    if (!action || action.type === 'none') return;
    if (DismissManager.isDismissed(action.type)) return;

    switch (action.type) {
      case 'alternative_nudge':
        return renderAlternativeNudge(action.data);
      case 'comparison_bar':
        return renderComparisonBar(action.data);
      case 'tag_navigator':
        return renderTagNavigator(action.data);
      case 'trust_nudge':
        return renderTrustNudge(action.data);
    }
  };

  // Inject shared CSS once
  injectStyles(BASE_CSS);

  // Component render functions — defined in subsequent phases
  // Each phase appends its function to this file
```

### 7. Placeholder Component Functions

```js
  function renderAlternativeNudge(data) { /* Phase 02 */ }
  function renderComparisonBar(data)     { /* Phase 03 */ }
  function renderTagNavigator(data)      { /* Phase 04 */ }
  function renderTrustNudge(data)        { /* Phase 05 */ }

})();
```

## Todo List
- [ ] Replace widget-renderer.js stub with IIFE skeleton
- [ ] Implement DismissManager with localStorage
- [ ] Implement DOM utilities (createElement, injectStyles, fadeIn, createDismissButton)
- [ ] Implement DOM anchor finders for product + cart pages
- [ ] Inject shared CSS with theme variable fallbacks
- [ ] Expose `window.SmartRecRender` dispatcher
- [ ] Add checkout page guard
- [ ] Test: `SmartRecRender({ type: "alternative_nudge", data: {...} })` from console — no crash, dismissed state works

## Success Criteria
- `window.SmartRecRender` callable from browser console
- Checkout pages: function not exposed / returns early
- `DismissManager.dismiss("test")` persists across page reload
- Shared CSS injected into `<head>` with theme variable references
- DOM anchor finders return valid elements on Dawn theme

## Risk Assessment
- **Theme selector variance:** Mitigated with ordered fallback selectors + parent element fallback
- **localStorage quota:** Silent catch, widget shows again (acceptable degradation)
- **CSS variable naming:** Fallback chain covers Dawn v15+, legacy Dawn, and generic defaults
