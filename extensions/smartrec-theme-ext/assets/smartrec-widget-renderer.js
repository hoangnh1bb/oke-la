/**
 * SmartRec Widget Renderer
 * Dumb renderer — receives action objects from Intent Engine, renders UI.
 * No API calls. No business logic. Data comes pre-resolved from server.
 * All product data fetched from Shopify Admin API by Intent Engine.
 */
(function SmartRecWidgets() {
  'use strict';

  if (!window.SmartRecMeta) return;
  if (/\/checkout/i.test(window.location.pathname)) return;
  if (window.SmartRecMeta.enableWidgets === false) return;

  var STORAGE_KEY = 'sr_dismissed';
  var ANIM_DURATION = 300;
  var NUDGE_DELAY = 3000;

  // ── Dismiss Manager ──────────────────────────────────────────────

  var DismissManager = {
    _cache: null,

    _load: function() {
      if (this._cache) return this._cache;
      try {
        this._cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch (e) {
        this._cache = {};
      }
      return this._cache;
    },

    isDismissed: function(widgetType) {
      return !!this._load()[widgetType];
    },

    dismiss: function(widgetType) {
      var data = this._load();
      data[widgetType] = Date.now();
      this._cache = data;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) { /* silent */ }
    }
  };

  // ── DOM Utilities ────────────────────────────────────────────────

  function createElement(tag, className, attrs) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        el.setAttribute(keys[i], attrs[keys[i]]);
      }
    }
    return el;
  }

  function injectStyles(id, css) {
    if (document.getElementById(id)) return;
    var style = createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function fadeIn(el, delay) {
    el.style.opacity = '0';
    el.style.transition = 'opacity ' + ANIM_DURATION + 'ms ease';
    setTimeout(function() { el.style.opacity = '1'; }, delay || 16);
  }

  function createDismissButton(widgetType, container) {
    var btn = createElement('button', 'sr-dismiss', {
      'aria-label': 'Close',
      'type': 'button'
    });
    btn.innerHTML = '&#x2715;';
    btn.addEventListener('click', function() {
      DismissManager.dismiss(widgetType);
      container.style.opacity = '0';
      setTimeout(function() { container.remove(); }, ANIM_DURATION);
    });
    return btn;
  }

  function renderStars(rating) {
    var full = Math.round(rating);
    if (full < 0) full = 0;
    if (full > 5) full = 5;
    var stars = '';
    for (var i = 0; i < full; i++) stars += '★';
    for (var j = full; j < 5; j++) stars += '☆';
    return stars;
  }

  // ── Event Tracking ─────────────────────────────────────────────

  function trackEvent(eventType, widgetType, productId, value) {
    var proxyBase = window.SmartRecMeta && window.SmartRecMeta.appProxy;
    if (!proxyBase) return;
    var payload = { eventType: eventType };
    if (widgetType) payload.widgetType = widgetType;
    if (productId) payload.productId = String(productId);
    if (value) payload.value = value;
    try {
      fetch(proxyBase + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function() {});
    } catch (e) { /* silent */ }
  }

  // ── DOM Anchor Finders ──────────────────────────────────────────

  function findBlockAnchor(id) {
    if (window.SmartRecMeta && window.SmartRecMeta.blockAnchor) {
      var block = document.getElementById(window.SmartRecMeta.blockAnchor);
      if (block) return block;
    }
    if (id) {
      var el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function findProductDescriptionAnchor() {
    var block = findBlockAnchor('sr-product-block');
    if (block) return block;

    var selectors = [
      '.product__description',
      '.product-single__description',
      '[data-product-description]',
      '.product__info-container .rte',
      '.product-description',
      '.product__content .rte'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    var atcForm = document.querySelector(
      'form[action="/cart/add"], .product-form, [data-product-form]'
    );
    if (atcForm) return atcForm.previousElementSibling || atcForm.parentElement;
    return document.querySelector('main, #MainContent, #main-content');
  }

  function findCartItemsAnchor() {
    var block = findBlockAnchor('sr-cart-block');
    if (block) return block;

    var selectors = [
      '.cart__items',
      '.cart-items',
      '[data-cart-items]',
      '.cart__contents',
      'form[action="/cart"] tbody',
      'form[action="/cart"] .cart-item:last-child'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  // ── Shared CSS (with custom style overrides) ───────────────────

  function buildBaseCSS() {
    var s = window.SmartRecStyles || {};
    var accent = s.accentColor || 'var(--color-button,var(--color-base-accent-1,#222))';
    var text = s.textColor || 'var(--color-foreground,var(--color-base-text,inherit))';
    var bg = s.bgColor || 'var(--color-background,var(--color-base-background-1,#fff))';
    var radius = (s.borderRadius != null ? s.borderRadius + 'px' : 'var(--buttons-radius,4px)');
    var fontSize = (s.fontSize || 14) + 'px';
    var btnStyle = s.buttonStyle || 'filled';

    var btnFilled = 'background:' + accent + ';color:#fff;border:1px solid ' + accent + ';';
    var btnOutline = 'background:transparent;color:' + accent + ';border:1px solid ' + accent + ';';
    var btnSoft = 'background:' + accent + '15;color:' + accent + ';border:1px solid transparent;';
    var btnCSS = btnStyle === 'outline' ? btnOutline : btnStyle === 'soft' ? btnSoft : btnFilled;

    return [
      '.sr-widget{',
        'font-family:var(--font-body-family,var(--font-family,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif));',
        'color:' + text + ';',
        'background:' + bg + ';',
        'border-radius:' + radius + ';',
        'font-size:' + fontSize + ';',
        'box-sizing:border-box;line-height:1.5;-webkit-font-smoothing:antialiased;',
        '--sr-accent:' + accent + ';',
        '--sr-text:' + text + ';',
        '--sr-bg:' + bg + ';',
        '--sr-radius:' + radius + ';',
        '--sr-font-size:' + fontSize + ';',
      '}',
      '.sr-widget *,.sr-widget *::before,.sr-widget *::after{box-sizing:border-box;}',
      '.sr-widget .sr-btn{' + btnCSS + 'border-radius:' + radius + ';cursor:pointer;transition:opacity 150ms;}',
      '.sr-widget .sr-btn:hover{opacity:0.85;}',
      '.sr-dismiss{',
        'position:absolute;top:8px;right:8px;width:28px;height:28px;',
        'border:none;background:transparent;color:' + text + ';',
        'font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;',
        'opacity:0.6;z-index:10;border-radius:50%;transition:opacity 150ms,background 150ms;',
      '}',
      '.sr-dismiss:hover{opacity:1;background:rgba(0,0,0,0.05);}',
      '.sr-widget a{color:inherit;text-decoration:none;}',
      '.sr-widget img{display:block;max-width:100%;height:auto;}',
      '@media(max-width:749px){.sr-widget{font-size:' + Math.max(parseInt(fontSize) - 1, 12) + 'px;}}',
      s.customCSS || ''
    ].join('');
  }

  injectStyles('sr-base', buildBaseCSS());

  window.SmartRecApplyStyles = function(newStyles) {
    window.SmartRecStyles = newStyles;
    var el = document.getElementById('sr-base');
    if (el) el.textContent = buildBaseCSS();
    applyLiquidBlockStyles(newStyles);
  };

  function applyLiquidBlockStyles(s) {
    if (!s) return;
    var accent = s.accentColor;
    var text = s.textColor;
    var bg = s.bgColor;
    var radius = s.borderRadius != null ? s.borderRadius + 'px' : null;
    var fontSize = s.fontSize ? s.fontSize + 'px' : null;
    var btnStyle = s.buttonStyle || 'filled';
    var title = s.widgetTitle;

    var css = [];

    if (bg) {
      css.push('.sr-ph-popup{background:' + bg + ' !important;}');
      css.push('.sr-ph-trigger{background:' + bg + ' !important;}');
    }
    if (text) {
      css.push('.sr-ph-popup-title{color:' + text + ' !important;}');
      css.push('.sr-ph-popup-sub{color:' + text + ' !important;}');
      css.push('.sr-ph-name{color:' + text + ' !important;}');
      css.push('.sr-ph-price{color:' + text + ' !important;}');
      css.push('.sr-ph-info{color:' + text + ' !important;}');
      css.push('.sr-ph-trigger{color:' + text + ' !important;}');
      css.push('.sr-ph-trigger-label{color:' + text + ' !important;}');
      css.push('.sr-ph-trigger-hint{color:' + text + ' !important;}');
      css.push('.sr-ph-close{color:' + text + ' !important;}');
    }
    if (radius) {
      css.push('.sr-ph-popup{border-radius:' + radius + ' !important;}');
      css.push('.sr-ph-trigger{border-radius:' + radius + ' !important;}');
      css.push('.sr-ph-atc{border-radius:' + radius + ' !important;}');
      css.push('.sr-ph-view{border-radius:' + radius + ' !important;}');
      css.push('.sr-ph-img{border-radius:' + radius + ' !important;}');
    }
    if (fontSize) {
      css.push('.sr-ph-popup-title{font-size:' + (parseInt(fontSize) + 2) + 'px !important;}');
      css.push('.sr-ph-name{font-size:' + fontSize + ' !important;}');
      css.push('.sr-ph-price{font-size:' + (parseInt(fontSize) + 1) + 'px !important;}');
      css.push('.sr-ph-popup-sub{font-size:' + (parseInt(fontSize) - 1) + 'px !important;}');
    }

    if (accent) {
      if (btnStyle === 'filled') {
        css.push('.sr-ph-atc{background:' + accent + ' !important;color:#fff !important;border-color:' + accent + ' !important;}');
      } else if (btnStyle === 'outline') {
        css.push('.sr-ph-atc{background:transparent !important;color:' + accent + ' !important;border:1px solid ' + accent + ' !important;}');
      } else if (btnStyle === 'text') {
        css.push('.sr-ph-atc{background:transparent !important;color:' + accent + ' !important;border:none !important;text-decoration:underline !important;}');
      } else {
        css.push('.sr-ph-atc{background:' + accent + ' !important;color:#fff !important;border-color:' + accent + ' !important;}');
      }
      css.push('.sr-ph-view{border-color:' + accent + ' !important;color:' + accent + ' !important;}');
    }

    if (s.customCSS) css.push(s.customCSS);

    var tag = document.getElementById('sr-liquid-override');
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'sr-liquid-override';
      document.body.appendChild(tag);
    }
    tag.textContent = css.join('');

    if (title) {
      var subEls = document.querySelectorAll('.sr-ph-popup-sub');
      for (var j = 0; j < subEls.length; j++) {
        subEls[j].textContent = title;
      }
    }
  }

  // ================================================================
  // COMPONENT 1: Alternative Nudge
  // UC-01: Hesitating Shopper — popup with Add to Cart
  // ================================================================

  function shopifyRoot() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  }

  function isThemeEditor() {
    return !!(window.Shopify && window.Shopify.designMode);
  }

  function getSectionIds() {
    var ids = [];
    var candidates = ['cart-notification-product','cart-notification-button','cart-icon-bubble','cart-drawer','cart-notification','main-cart-items','cart-live-region-text'];
    for (var i = 0; i < candidates.length; i++) {
      if (document.getElementById('shopify-section-' + candidates[i])) ids.push(candidates[i]);
    }
    return ids;
  }

  function updateSections(sections) {
    if (!sections) return;
    var keys = Object.keys(sections);
    for (var i = 0; i < keys.length; i++) {
      var el = document.getElementById('shopify-section-' + keys[i]);
      if (el && sections[keys[i]]) {
        try {
          el.innerHTML = new DOMParser()
            .parseFromString(sections[keys[i]], 'text/html')
            .querySelector('.shopify-section').innerHTML;
        } catch(e) {
          el.innerHTML = sections[keys[i]];
        }
      }
    }
  }

  function refreshCartUI(atcSections) {
    if (atcSections) updateSections(atcSections);

    fetch(shopifyRoot() + 'cart.js', { headers: { 'Accept': 'application/json' } })
    .then(function(r) { return r.json(); })
    .then(function(cart) {
      var countEls = document.querySelectorAll(
        '.cart-count-bubble span, [data-cart-count], .cart-count, .js-cart-count, #cart-icon-bubble span, .header__cart-count'
      );
      for (var j = 0; j < countEls.length; j++) countEls[j].textContent = cart.item_count;
      var bubbles = document.querySelectorAll('.cart-count-bubble');
      for (var k = 0; k < bubbles.length; k++) {
        if (cart.item_count > 0) bubbles[k].removeAttribute('hidden');
      }
      try {
        document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true, detail: { cart: cart } }));
        document.documentElement.dispatchEvent(new CustomEvent('cart:change', { bubbles: true, detail: { cart: cart } }));
      } catch(e) {}
    }).catch(function() {});

    var cd = document.querySelector('cart-drawer');
    if (cd) {
      if (typeof cd.renderContents === 'function') {
        fetch(shopifyRoot() + '?sections=cart-drawer')
        .then(function(r) { return r.json(); })
        .then(function(s) {
          var html = s['cart-drawer'];
          if (html) {
            try {
              var parsed = new DOMParser().parseFromString(html, 'text/html');
              var newInner = parsed.querySelector('cart-drawer');
              if (newInner) cd.innerHTML = newInner.innerHTML;
            } catch(e) {}
          }
          if (typeof cd.open === 'function') cd.open();
        }).catch(function() {});
      } else {
        cd.classList.add('active', 'is-open');
        var det = cd.querySelector('details');
        if (det) det.setAttribute('open', '');
      }
    }

    var cn = document.querySelector('cart-notification');
    if (cn) {
      fetch(shopifyRoot() + '?sections=cart-notification-product,cart-notification-button')
      .then(function(r) { return r.json(); })
      .then(function(s) {
        updateSections(s);
        if (typeof cn.open === 'function') { cn.open(); }
        else { cn.classList.add('animate', 'active'); cn.removeAttribute('hidden'); }
      }).catch(function() {
        if (typeof cn.open === 'function') { cn.open(); }
        else { cn.classList.add('animate', 'active'); cn.removeAttribute('hidden'); }
      });
    }
  }

  function addToCart(variantId, btn, closePopupFn, widgetType, productId, productPrice) {
    if (!variantId) { btn.textContent = 'No variant'; return; }

    if (isThemeEditor()) {
      btn.textContent = '✓ Added (preview)';
      btn.style.background = '#059669'; btn.style.borderColor = '#059669'; btn.style.color = '#fff';
      setTimeout(function() {
        btn.textContent = 'Add to cart';
        btn.style.background = ''; btn.style.borderColor = ''; btn.style.color = '';
      }, 1500);
      return;
    }

    var origText = btn.textContent;
    btn.textContent = 'Adding...';
    btn.disabled = true;

    var sectionIds = getSectionIds();
    var payload = { items: [{ id: parseInt(variantId, 10), quantity: 1 }] };
    if (sectionIds.length > 0) payload.sections = sectionIds.join(',');

    fetch(shopifyRoot() + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res) {
      if (!res.ok) return res.json().then(function(e) { throw new Error(e.description || 'HTTP ' + res.status); });
      return res.json();
    }).then(function(data) {
      btn.textContent = '✓ Added';
      btn.style.background = '#059669';
      btn.style.borderColor = '#059669';
      btn.style.color = '#fff';

      refreshCartUI(data.sections);
      if (closePopupFn) closePopupFn();

      try {
        var item = data.items ? data.items[0] : data;
        var atcValue = 0;
        if (productPrice) {
          atcValue = parseFloat(String(productPrice).replace(/[^\d.]/g, '')) || 0;
        } else if (item && item.price) {
          atcValue = item.price;
        }
        trackEvent('widget_atc', widgetType || 'alternative_nudge', productId || item.product_id, atcValue);
      } catch(e) {}

      setTimeout(function() {
        btn.textContent = origText;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        btn.disabled = false;
      }, 2500);
    }).catch(function(err) {
      console.error('[SmartRec] ATC error:', err);
      btn.textContent = err.message || 'Error — retry';
      btn.disabled = false;
      setTimeout(function() { btn.textContent = origText; btn.disabled = false; }, 3000);
    });
  }

  var ALT_NUDGE_CSS = [
    '.sr-alt-overlay{',
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;',
      'background:rgba(0,0,0,0.45);display:none;align-items:center;justify-content:center;',
      'padding:16px;opacity:0;transition:opacity 300ms ease;',
    '}',
    '.sr-alt-overlay--open{display:flex;opacity:1;}',
    '.sr-alt-popup{',
      'position:relative;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;',
      'padding:24px;border-radius:var(--sr-radius,12px);background:var(--sr-bg,#ffffff);',
      'box-shadow:0 20px 60px rgba(0,0,0,0.2);',
    '}',
    '.sr-alt-popup__title{font-size:var(--sr-font-size,16px);font-weight:600;margin:0 0 4px;padding-right:36px;color:var(--sr-text,var(--color-foreground,inherit));}',
    '.sr-alt-popup__subtitle{font-size:13px;margin:0 0 16px;opacity:0.6;color:var(--sr-text,inherit);}',
    '.sr-alt-popup__item{display:flex;gap:14px;padding:14px 0;}',
    '.sr-alt-popup__item+.sr-alt-popup__item{border-top:1px solid rgba(0,0,0,0.06);}',
    '.sr-alt-popup__img{width:100px;height:100px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#f3f4f6;}',
    '.sr-alt-popup__info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;}',
    '.sr-alt-popup__name{font-size:var(--sr-font-size,15px);font-weight:500;margin:0 0 4px;color:var(--sr-text,inherit);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.sr-alt-popup__price{font-size:calc(var(--sr-font-size,15px) + 1px);font-weight:700;margin:0 0 10px;color:var(--sr-text,inherit);}',
    '.sr-alt-popup__actions{display:flex;gap:8px;flex-wrap:wrap;}',
    '.sr-alt-popup__atc{',
      'display:inline-flex;align-items:center;justify-content:center;gap:4px;',
      'padding:8px 16px;font-size:13px;font-weight:600;',
      'background:var(--sr-accent);color:var(--color-button-text,#fff);',
      'border:1px solid var(--sr-accent);border-radius:var(--buttons-radius,4px);',
      'cursor:pointer;transition:opacity 150ms;min-width:120px;',
    '}',
    '.sr-alt-popup__atc:hover{opacity:0.85;}',
    '.sr-alt-popup__atc:disabled{opacity:0.6;cursor:default;}',
    '.sr-alt-popup__view{',
      'display:inline-flex;align-items:center;justify-content:center;',
      'padding:8px 16px;font-size:13px;font-weight:500;',
      'border:1px solid rgba(0,0,0,0.15);color:var(--color-foreground,inherit);',
      'background:transparent;border-radius:var(--buttons-radius,4px);',
      'cursor:pointer;text-decoration:none;transition:background 150ms;',
    '}',
    '.sr-alt-popup__view:hover{background:rgba(0,0,0,0.04);}',
    '.sr-alt-trigger{',
      'position:relative;display:flex;align-items:center;gap:8px;',
      'padding:12px 16px;margin:16px 0;',
      'background:var(--sr-bg,var(--color-background,#fff));',
      'border:1px solid rgba(0,0,0,0.08);cursor:pointer;',
      'border-radius:var(--sr-radius,var(--buttons-radius,4px));',
      'transition:border-color 150ms,box-shadow 150ms;',
    '}',
    '.sr-alt-trigger:hover{border-color:rgba(0,0,0,0.2);box-shadow:0 2px 8px rgba(0,0,0,0.06);}',
    '.sr-alt-trigger__thumbs{display:flex;gap:6px;}',
    '.sr-alt-trigger__thumb{width:40px;height:40px;border-radius:6px;object-fit:cover;background:#f3f4f6;}',
    '.sr-alt-trigger__text{flex:1;min-width:0;}',
    '.sr-alt-trigger__label{font-size:13px;font-weight:600;margin:0 0 1px;}',
    '.sr-alt-trigger__hint{font-size:12px;margin:0;opacity:0.6;}',
    '.sr-alt-trigger__arrow{font-size:18px;opacity:0.4;flex-shrink:0;}',
    '@media(max-width:749px){',
      '.sr-alt-popup{padding:20px;max-width:100%;border-radius:12px 12px 0 0;align-self:flex-end;}',
      '.sr-alt-popup__img{width:80px;height:80px;}',
      '.sr-alt-popup__name{font-size:14px;}',
      '.sr-alt-popup__price{font-size:15px;}',
      '.sr-alt-popup__actions{flex-direction:column;}',
      '.sr-alt-popup__atc,.sr-alt-popup__view{width:100%;justify-content:center;}',
    '}'
  ].join('');

  function renderAlternativeNudge(data) {
    if (!data || !data.products || !data.products.length) return;
    if (document.querySelector('.sr-alt-trigger')) return;

    var anchor = findProductDescriptionAnchor();
    if (!anchor) return;

    injectStyles('sr-alt-nudge-css', ALT_NUDGE_CSS);

    var products = data.products.slice(0, 2);

    // Trigger button (inline, shows mini preview)
    var trigger = createElement('div', 'sr-widget sr-alt-trigger', {
      'role': 'button', 'tabindex': '0',
      'aria-label': 'View product suggestions'
    });

    var thumbs = createElement('div', 'sr-alt-trigger__thumbs');
    for (var t = 0; t < products.length; t++) {
      var thumb = createElement('img', 'sr-alt-trigger__thumb', {
        'src': products[t].image_url || '', 'alt': '', 'width': '40', 'height': '40', 'loading': 'lazy'
      });
      thumbs.appendChild(thumb);
    }

    var triggerText = createElement('div', 'sr-alt-trigger__text');
    var triggerLabel = createElement('p', 'sr-alt-trigger__label');
    triggerLabel.textContent = 'Product Recommendations';
    var triggerHint = createElement('p', 'sr-alt-trigger__hint');
    triggerHint.textContent = products.length + ' similar products — tap to view';
    triggerText.appendChild(triggerLabel);
    triggerText.appendChild(triggerHint);

    var arrow = createElement('span', 'sr-alt-trigger__arrow');
    arrow.textContent = '›';

    trigger.appendChild(thumbs);
    trigger.appendChild(triggerText);
    trigger.appendChild(arrow);
    trigger.appendChild(createDismissButton('alternative_nudge', trigger));

    // Popup overlay
    var overlay = createElement('div', 'sr-widget sr-alt-overlay');
    var popup = createElement('div', 'sr-alt-popup');

    var title = createElement('p', 'sr-alt-popup__title');
    title.textContent = 'Product Recommendations';

    var subtitle = createElement('p', 'sr-alt-popup__subtitle');
    subtitle.textContent = 'Products you recently viewed';

    popup.appendChild(title);
    popup.appendChild(subtitle);

    var closeBtn = createElement('button', 'sr-dismiss', { 'aria-label': 'Close', 'type': 'button' });
    closeBtn.innerHTML = '&#x2715;';
    popup.appendChild(closeBtn);

    for (var i = 0; i < products.length; i++) {
      var product = products[i];
      var item = createElement('div', 'sr-alt-popup__item');

      var img = createElement('img', 'sr-alt-popup__img', {
        'src': product.image_url || '', 'alt': product.title || '',
        'loading': 'lazy', 'width': '100', 'height': '100'
      });

      var info = createElement('div', 'sr-alt-popup__info');
      var name = createElement('p', 'sr-alt-popup__name');
      name.textContent = product.title || '';
      var price = createElement('p', 'sr-alt-popup__price');
      price.textContent = product.price || '';

      var actions = createElement('div', 'sr-alt-popup__actions');

      var atcBtn = createElement('button', 'sr-alt-popup__atc', { 'type': 'button' });
      atcBtn.textContent = 'Add to cart';
      (function(vid, el, pid, pprice) {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          addToCart(vid, el, closePopup, 'alternative_nudge', pid, pprice);
        });
      })(product.variant_id, atcBtn, product.id, product.price);

      var viewBtn = createElement('a', 'sr-alt-popup__view', { 'href': product.url || '#' });
      viewBtn.textContent = 'View details';
      (function(pid) {
        viewBtn.addEventListener('click', function() {
          trackEvent('view_detail', 'alternative_nudge', pid, 0);
        });
      })(product.id);

      actions.appendChild(atcBtn);
      actions.appendChild(viewBtn);
      info.appendChild(name);
      info.appendChild(price);
      info.appendChild(actions);
      item.appendChild(img);
      item.appendChild(info);
      popup.appendChild(item);
    }

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    function openPopup() {
      overlay.style.display = 'flex';
      setTimeout(function() { overlay.classList.add('sr-alt-overlay--open'); }, 10);
    }

    function closePopup() {
      overlay.classList.remove('sr-alt-overlay--open');
      setTimeout(function() { overlay.style.display = 'none'; }, ANIM_DURATION);
    }
    trigger.addEventListener('click', function(e) {
      if (e.target.closest('.sr-dismiss')) return;
      openPopup();
    });
    trigger.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.target.closest('.sr-dismiss')) openPopup();
    });
    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', function(e) {
      var popup = overlay.querySelector('.sr-alt-popup');
      if (popup && !popup.contains(e.target)) closePopup();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('sr-alt-overlay--open')) closePopup();
    });

    if (anchor.id === 'sr-product-block') {
      anchor.appendChild(trigger);
    } else {
      anchor.insertAdjacentElement('afterend', trigger);
    }
    fadeIn(trigger, NUDGE_DELAY);

    for (var pi = 0; pi < products.length; pi++) {
      trackEvent('impression', 'alternative_nudge', products[pi].id, 0);
    }
  }

  // ================================================================
  // COMPONENT 2: Comparison Bar
  // UC-02: Comparison Shopper — sticky bottom + slide-up panel
  // ================================================================

  var COMPARE_CSS = [
    '.sr-compare-bar{',
      'position:fixed;bottom:0;left:0;right:0;height:60px;z-index:9998;',
      'display:flex;align-items:center;gap:12px;padding:0 16px;',
      'border-top:1px solid rgba(0,0,0,0.1);box-shadow:0 -2px 8px rgba(0,0,0,0.06);',
    '}',
    '.sr-compare-bar__thumb{width:40px;height:40px;border-radius:var(--buttons-radius,4px);object-fit:cover;flex-shrink:0;}',
    '.sr-compare-bar__name{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;}',
    '.sr-compare-bar__diffs{display:flex;gap:8px;font-size:12px;opacity:0.7;flex-shrink:0;}',
    '.sr-compare-bar__diff{white-space:nowrap;}',
    '.sr-compare-bar__cta{',
      'margin-left:auto;padding:6px 16px;font-size:13px;font-weight:600;',
      'background:var(--sr-accent);color:var(--color-button-text,#fff);',
      'border:none;border-radius:var(--buttons-radius,4px);cursor:pointer;flex-shrink:0;transition:opacity 150ms;',
    '}',
    '.sr-compare-bar__cta:hover{opacity:0.85;}',
    '.sr-compare-panel{',
      'position:fixed;bottom:0;left:0;right:0;max-height:80vh;z-index:9999;',
      'padding:24px;border-top:1px solid rgba(0,0,0,0.1);box-shadow:0 -4px 24px rgba(0,0,0,0.12);',
      'transform:translateY(100%);transition:transform 300ms ease;overflow-y:auto;',
    '}',
    '.sr-compare-panel--open{transform:translateY(0);}',
    '.sr-compare-panel__title{font-size:16px;font-weight:600;margin:0 0 16px;padding-right:32px;}',
    '.sr-compare-panel__grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}',
    '.sr-compare-panel__product{text-align:center;}',
    '.sr-compare-panel__img{width:100%;max-width:200px;aspect-ratio:1;object-fit:cover;border-radius:var(--buttons-radius,4px);margin:0 auto 12px;}',
    '.sr-compare-panel__name{font-size:14px;font-weight:600;margin:0 0 4px;}',
    '.sr-compare-panel__price{font-size:16px;font-weight:700;margin:0 0 8px;}',
    '.sr-compare-panel__rating{font-size:13px;margin:0 0 12px;opacity:0.7;}',
    '.sr-compare-panel__link{',
      'display:inline-block;padding:8px 20px;font-size:13px;font-weight:500;',
      'border:1px solid var(--sr-accent);color:var(--sr-accent);',
      'border-radius:var(--buttons-radius,4px);transition:background 150ms,color 150ms;',
    '}',
    '.sr-compare-panel__link:hover{background:var(--sr-accent);color:var(--color-button-text,#fff);}',
    '@media(max-width:749px){',
      '.sr-compare-bar__diffs{display:none;}',
      '.sr-compare-bar__name{max-width:100px;}',
      '.sr-compare-panel__grid{grid-template-columns:1fr;}',
      '.sr-compare-panel{padding:16px;}',
    '}'
  ].join('');

  function renderComparisonBar(data) {
    if (!data || !data.productA || !data.productB) return;
    if (document.querySelector('.sr-compare-bar')) return;

    injectStyles('sr-compare-css', COMPARE_CSS);

    var bar = createElement('div', 'sr-widget sr-compare-bar');

    var thumb = createElement('img', 'sr-compare-bar__thumb', {
      'src': data.productA.image_url || '',
      'alt': data.productA.title || '',
      'width': '40', 'height': '40', 'loading': 'lazy'
    });

    var name = createElement('span', 'sr-compare-bar__name');
    name.textContent = data.productA.title || '';

    var diffs = createElement('span', 'sr-compare-bar__diffs');
    var diffPoints = (data.diff_points || []).slice(0, 2);
    for (var i = 0; i < diffPoints.length; i++) {
      var d = createElement('span', 'sr-compare-bar__diff');
      d.textContent = (i > 0 ? '· ' : '') + diffPoints[i];
      diffs.appendChild(d);
    }

    var cta = createElement('button', 'sr-compare-bar__cta', { 'type': 'button' });
    cta.textContent = 'Compare';

    bar.appendChild(thumb);
    bar.appendChild(name);
    bar.appendChild(diffs);
    bar.appendChild(cta);
    bar.appendChild(createDismissButton('comparison_bar', bar));

    document.body.appendChild(bar);
    fadeIn(bar, 0);

    trackEvent('impression', 'comparison_bar', data.productA.id, 0);
    trackEvent('impression', 'comparison_bar', data.productB.id, 0);

    // Build comparison panel
    var panel = createElement('div', 'sr-widget sr-compare-panel');

    var panelTitle = createElement('p', 'sr-compare-panel__title');
    panelTitle.textContent = 'Compare products';
    panel.appendChild(panelTitle);

    var panelDismiss = createElement('button', 'sr-dismiss', {
      'aria-label': 'Close', 'type': 'button'
    });
    panelDismiss.innerHTML = '&#x2715;';
    panel.appendChild(panelDismiss);

    var grid = createElement('div', 'sr-compare-panel__grid');
    var productsToCompare = [data.productA, data.productB];

    for (var j = 0; j < productsToCompare.length; j++) {
      var product = productsToCompare[j];
      var card = createElement('div', 'sr-compare-panel__product');

      var pImg = createElement('img', 'sr-compare-panel__img', {
        'src': product.image_url || '', 'alt': product.title || '', 'loading': 'lazy'
      });
      var pName = createElement('p', 'sr-compare-panel__name');
      pName.textContent = product.title || '';

      var pPrice = createElement('p', 'sr-compare-panel__price');
      pPrice.textContent = product.price || '';

      var pRating = createElement('p', 'sr-compare-panel__rating');
      if (product.rating) {
        pRating.setAttribute('aria-label', product.rating + ' out of 5 stars');
        pRating.textContent = renderStars(product.rating) + ' (' + (product.review_count || 0) + ' reviews)';
      } else if (product.review_count) {
        pRating.textContent = product.review_count + ' reviews';
      }

      var pLink = createElement('a', 'sr-compare-panel__link', { 'href': product.url || '#' });
      pLink.textContent = 'View product';

      card.appendChild(pImg);
      card.appendChild(pName);
      card.appendChild(pPrice);
      if (pRating.textContent) card.appendChild(pRating);
      card.appendChild(pLink);
      grid.appendChild(card);
    }

    panel.appendChild(grid);
    document.body.appendChild(panel);

    var expanded = false;
    cta.addEventListener('click', function() {
      expanded = !expanded;
      if (expanded) {
        panel.classList.add('sr-compare-panel--open');
        bar.style.display = 'none';
      } else {
        panel.classList.remove('sr-compare-panel--open');
        bar.style.display = 'flex';
      }
    });

    function dismissAll() {
      DismissManager.dismiss('comparison_bar');
      bar.style.opacity = '0';
      panel.classList.remove('sr-compare-panel--open');
      setTimeout(function() { bar.remove(); panel.remove(); }, ANIM_DURATION);
    }

    panelDismiss.addEventListener('click', dismissAll);
  }

  // ================================================================
  // COMPONENT 3: Tag Navigator
  // UC-03: Lost Shopper — slide-in panel from right
  // ================================================================

  var TAG_NAV_CSS = [
    '.sr-tag-nav{',
      'position:fixed;top:50%;right:0;transform:translateX(100%) translateY(-50%);',
      'width:260px;z-index:9998;padding:20px;',
      'border-left:1px solid rgba(0,0,0,0.08);box-shadow:-4px 0 16px rgba(0,0,0,0.08);',
      'transition:transform 300ms ease;',
    '}',
    '.sr-tag-nav--open{transform:translateX(0) translateY(-50%);}',
    '.sr-tag-nav__title{font-size:14px;font-weight:600;margin:0 0 4px;padding-right:28px;}',
    '.sr-tag-nav__subtitle{font-size:13px;opacity:0.7;margin:0 0 16px;}',
    '.sr-tag-nav__tags{display:flex;flex-direction:column;gap:8px;}',
    '.sr-tag-nav__tag{',
      'display:block;width:100%;padding:10px 14px;font-size:14px;font-weight:500;',
      'text-align:left;border:1px solid rgba(0,0,0,0.12);background:transparent;',
      'color:var(--color-foreground,inherit);border-radius:var(--buttons-radius,4px);',
      'cursor:pointer;transition:background 150ms,border-color 150ms;text-decoration:none;',
    '}',
    '.sr-tag-nav__tag:hover{background:var(--sr-accent);color:var(--color-button-text,#fff);border-color:var(--sr-accent);}',
    '@media(max-width:749px){',
      '.sr-tag-nav{width:220px;padding:16px;}',
      '.sr-tag-nav__tag{font-size:13px;padding:8px 12px;}',
    '}'
  ].join('');

  function renderTagNavigator(data) {
    if (!data || !data.tags || !data.tags.length) return;
    if (document.querySelector('.sr-tag-nav')) return;

    injectStyles('sr-tag-nav-css', TAG_NAV_CSS);

    var tags = data.tags.slice(0, 4);
    var panel = createElement('div', 'sr-widget sr-tag-nav', {
      'role': 'complementary',
      'aria-label': 'Search suggestions'
    });

    var title = createElement('p', 'sr-tag-nav__title');
    title.textContent = 'Still looking?';

    var subtitle = createElement('p', 'sr-tag-nav__subtitle');
    subtitle.textContent = 'Try filtering by:';

    panel.appendChild(title);
    panel.appendChild(subtitle);
    panel.appendChild(createDismissButton('tag_navigator', panel));

    var tagContainer = createElement('div', 'sr-tag-nav__tags');
    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i];
      var btn = createElement('a', 'sr-tag-nav__tag', {
        'href': '/collections/all?filter.p.tag=' + encodeURIComponent(tag.value)
      });
      btn.textContent = tag.label;
      tagContainer.appendChild(btn);
    }
    panel.appendChild(tagContainer);

    document.body.appendChild(panel);
    trackEvent('impression', 'tag_navigator', null, 0);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        panel.classList.add('sr-tag-nav--open');
      });
    });
  }

  // ================================================================
  // COMPONENT 4: Trust Nudge
  // UC-04: Cart Doubt — inline below cart items
  // ================================================================

  var TRUST_CSS = [
    '.sr-trust-nudge{position:relative;padding:12px 16px;margin:12px 0;border:1px solid rgba(0,0,0,0.06);border-radius:var(--buttons-radius,4px);}',
    '.sr-trust-nudge__item{padding:8px 0;}',
    '.sr-trust-nudge__item+.sr-trust-nudge__item{border-top:1px solid rgba(0,0,0,0.06);}',
    '.sr-trust-nudge__product-name{font-size:13px;font-weight:600;margin:0 0 4px;padding-right:28px;}',
    '.sr-trust-nudge__meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px;}',
    '.sr-trust-nudge__stars{color:#f59e0b;letter-spacing:1px;}',
    '.sr-trust-nudge__reviews{opacity:0.7;}',
    '.sr-trust-nudge__separator{opacity:0.3;}',
    '.sr-trust-nudge__badge{',
      'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;',
      'font-size:12px;font-weight:500;background:rgba(16,185,129,0.1);color:#059669;border-radius:99px;',
    '}',
    '@media(max-width:749px){',
      '.sr-trust-nudge__product-name{font-size:12px;}',
      '.sr-trust-nudge__meta{font-size:12px;}',
    '}'
  ].join('');

  function renderTrustNudge(data) {
    if (!data || !data.items || !data.items.length) return;
    if (document.querySelector('.sr-trust-nudge')) return;

    var anchor = findCartItemsAnchor();
    if (!anchor) return;

    injectStyles('sr-trust-css', TRUST_CSS);

    var container = createElement('div', 'sr-widget sr-trust-nudge', {
      'role': 'complementary',
      'aria-label': 'Product info'
    });

    container.appendChild(createDismissButton('trust_nudge', container));

    var items = data.items.slice(0, 5);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var row = createElement('div', 'sr-trust-nudge__item');

      var itemName = createElement('p', 'sr-trust-nudge__product-name');
      itemName.textContent = item.title || '';

      var meta = createElement('div', 'sr-trust-nudge__meta');

      if (item.rating) {
        var stars = createElement('span', 'sr-trust-nudge__stars', {
          'aria-label': item.rating + ' out of 5 stars',
          'role': 'img'
        });
        stars.textContent = renderStars(item.rating);
        meta.appendChild(stars);
      }

      if (item.review_count > 0) {
        var reviews = createElement('span', 'sr-trust-nudge__reviews');
        reviews.textContent = item.review_count + ' reviews';
        meta.appendChild(reviews);
      }

      if (item.has_free_return) {
        if (meta.children.length > 0) {
          var sep = createElement('span', 'sr-trust-nudge__separator');
          sep.textContent = '·';
          meta.appendChild(sep);
        }
        var badge = createElement('span', 'sr-trust-nudge__badge');
        badge.textContent = '↩ Free 30-day returns';
        meta.appendChild(badge);
      }

      row.appendChild(itemName);
      row.appendChild(meta);
      container.appendChild(row);
    }

    if (anchor.id === 'sr-cart-block') {
      anchor.appendChild(container);
    } else {
      anchor.insertAdjacentElement('afterend', container);
    }
    fadeIn(container, 0);

    for (var ti = 0; ti < items.length; ti++) {
      trackEvent('impression', 'trust_nudge', items[ti].product_id, 0);
    }
  }

  // ── Action Dispatcher ───────────────────────────────────────────

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

})();
