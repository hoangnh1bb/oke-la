/**
 * SmartRec Signal Collector
 * Tracks behavioral signals on storefront, computes intent score,
 * calls Intent Engine, and triggers widget rendering.
 *
 * Signals tracked:
 *  - Page views (product pages)
 *  - Time on page / session duration
 *  - Back navigation count
 *  - Compare pattern (2+ products of same type)
 *  - Cart hesitation (time on cart page)
 *  - Cart items
 *  - Scroll depth
 */
(function SmartRecSignals() {
  'use strict';

  var META = window.SmartRecMeta;
  if (!META || !META.enableTracking) return;
  if (/\/checkout/i.test(window.location.pathname)) return;

  var SESSION_KEY = 'sr_session';
  var EVALUATE_DELAY = 4000;
  var CART_HESITATION_INTERVAL = 5000;

  // ── Session Management ──────────────────────────────────────

  function loadSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveSession(s) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch (e) { /* silent */ }
  }

  var session = loadSession();

  if (!session.startedAt) {
    session.startedAt = Date.now();
  }
  session.pageViews = session.pageViews || [];
  session.viewedTypes = session.viewedTypes || [];
  session.backNavCount = session.backNavCount || 0;
  session.cartItems = session.cartItems || [];
  session.cartHesitation = session.cartHesitation || 0;
  session.comparePattern = session.comparePattern || false;
  session.maxScroll = session.maxScroll || 0;
  session.pageEntryTime = Date.now();
  session.evaluated = session.evaluated || false;

  // ── Track Product Page Views ────────────────────────────────

  if (META.pageType === 'product' && META.productId) {
    session.currentProduct = META.productId;

    if (session.pageViews.indexOf(META.productId) === -1) {
      session.pageViews.push(META.productId);
    }

    if (META.productType) {
      session.viewedTypes.push(META.productType);

      var typeCount = {};
      for (var i = 0; i < session.viewedTypes.length; i++) {
        var t = session.viewedTypes[i];
        typeCount[t] = (typeCount[t] || 0) + 1;
        if (typeCount[t] >= 2) {
          session.comparePattern = true;
          break;
        }
      }
    }
  }

  // ── Track Cart Page ─────────────────────────────────────────

  if (META.pageType === 'cart' || /\/cart/i.test(window.location.pathname)) {
    session.onCartPage = true;

    if (META.cartItemCount > 0 && META.productId) {
      if (session.cartItems.indexOf(META.productId) === -1) {
        session.cartItems.push(META.productId);
      }
    }

    fetchCartItems();
  }

  function fetchCartItems() {
    var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    fetch(root + 'cart.js', { headers: { 'Accept': 'application/json' } })
    .then(function(r) { return r.json(); })
    .then(function(cart) {
      if (cart && cart.items) {
        session.cartItems = [];
        for (var i = 0; i < cart.items.length; i++) {
          var pid = cart.items[i].product_id;
          if (session.cartItems.indexOf(pid) === -1) {
            session.cartItems.push(pid);
          }
        }
        saveSession(session);
      }
    })
    .catch(function() {});
  }

  // ── Track Back Navigation ───────────────────────────────────

  if (window.performance && window.performance.navigation) {
    if (window.performance.navigation.type === 2) {
      session.backNavCount = (session.backNavCount || 0) + 1;
    }
  }
  if (window.performance && window.performance.getEntriesByType) {
    var navEntries = window.performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
      session.backNavCount = (session.backNavCount || 0) + 1;
    }
  }

  // ── Track Scroll Depth ──────────────────────────────────────

  var scrollTimer = null;
  window.addEventListener('scroll', function() {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function() {
      scrollTimer = null;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      var winHeight = window.innerHeight;
      var pct = docHeight > winHeight ? Math.round((scrollTop / (docHeight - winHeight)) * 100) : 100;
      if (pct > session.maxScroll) {
        session.maxScroll = pct;
      }
    }, 200);
  }, { passive: true });

  // ── Cart Hesitation Timer ───────────────────────────────────

  if (session.onCartPage) {
    setInterval(function() {
      session.cartHesitation = (session.cartHesitation || 0) + Math.round(CART_HESITATION_INTERVAL / 1000);
      saveSession(session);

      if (session.cartHesitation > 60 && !session.cartHesitationTriggered) {
        session.cartHesitationTriggered = true;
        evaluateAndAct();
      }
    }, CART_HESITATION_INTERVAL);
  }

  // ── Intent Score Computation (client-side estimate) ─────────

  function computeScore() {
    var score = 0;

    var duration = Math.round((Date.now() - session.startedAt) / 1000);

    var pageCount = session.pageViews.length;
    if (pageCount >= 1) score += 10;
    if (pageCount >= 2) score += 10;
    if (pageCount >= 3) score += 5;
    if (pageCount >= 5) score += 5;

    if (duration > 30) score += 5;
    if (duration > 60) score += 5;
    if (duration > 180) score += 5;

    if (session.maxScroll > 50) score += 5;
    if (session.maxScroll > 80) score += 5;

    if (session.comparePattern) score += 10;

    if (session.backNavCount >= 2) score += 10;
    if (session.backNavCount >= 4) score += 5;

    var timeOnPage = Math.round((Date.now() - session.pageEntryTime) / 1000);
    if (META.pageType === 'product' && timeOnPage > 15) score += 10;
    if (META.pageType === 'product' && timeOnPage > 30) score += 5;

    if (session.cartItems.length > 0) score += 15;

    if (session.onCartPage && session.cartHesitation > 60) score += 10;

    return Math.min(score, 100);
  }

  // ── Evaluate & Call Intent Engine ───────────────────────────

  function evaluateAndAct() {
    if (session.evaluated && !session.onCartPage) return;
    session.evaluated = true;
    saveSession(session);

    var score = computeScore();
    if (score < 30) return;

    var proxyBase = META.appProxy;
    if (!proxyBase) return;

    var payload = {
      session: {
        currentProduct: session.currentProduct || null,
        pageViews: session.pageViews.slice(-10),
        backNavCount: session.backNavCount,
        cartItems: session.cartItems,
        cartHesitation: session.cartHesitation || 0,
        comparePattern: session.comparePattern,
        sessionDuration: Math.round((Date.now() - session.startedAt) / 1000)
      },
      score: score,
      pageType: META.pageType || detectPageType()
    };

    fetch(proxyBase + '/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(action) {
      if (action && action.type !== 'none' && window.SmartRecRender) {
        window.SmartRecRender(action);
      }
    })
    .catch(function(err) {
      console.warn('[SmartRec] Intent engine error:', err.message);
    });
  }

  function detectPageType() {
    var path = window.location.pathname;
    if (/\/products\//.test(path)) return 'product';
    if (/\/cart/.test(path)) return 'cart';
    if (/\/collections\//.test(path)) return 'collection';
    return 'other';
  }

  // ── Fetch Config & Apply Custom Styles ──────────────────────

  function fetchConfigAndApplyStyles() {
    var proxyBase = META.appProxy;
    if (!proxyBase) return;

    fetch(proxyBase + '/config')
    .then(function(r) { return r.json(); })
    .then(function(config) {
      if (config && config.styles) {
        window.SmartRecStyles = config.styles;
        if (window.SmartRecApplyStyles) {
          window.SmartRecApplyStyles(config.styles);
        } else {
          applyStylesFallback(config.styles);
        }
      }
    })
    .catch(function() {});
  }

  function applyStylesFallback(s) {
    if (!s) return;
    var css = [];
    if (s.bgColor) {
      css.push('.sr-ph-popup{background:' + s.bgColor + ' !important;}');
      css.push('.sr-ph-trigger{background:' + s.bgColor + ' !important;}');
    }
    if (s.textColor) {
      css.push('.sr-ph-popup-title{color:' + s.textColor + ' !important;}');
      css.push('.sr-ph-popup-sub{color:' + s.textColor + ' !important;}');
      css.push('.sr-ph-name{color:' + s.textColor + ' !important;}');
      css.push('.sr-ph-price{color:' + s.textColor + ' !important;}');
      css.push('.sr-ph-info{color:' + s.textColor + ' !important;}');
      css.push('.sr-ph-trigger{color:' + s.textColor + ' !important;}');
      css.push('.sr-ph-trigger-label{color:' + s.textColor + ' !important;}');
      css.push('.sr-ph-trigger-hint{color:' + s.textColor + ' !important;}');
      css.push('.sr-ph-close{color:' + s.textColor + ' !important;}');
    }
    if (s.borderRadius != null) {
      var r = s.borderRadius + 'px';
      css.push('.sr-ph-popup{border-radius:' + r + ' !important;}');
      css.push('.sr-ph-trigger{border-radius:' + r + ' !important;}');
      css.push('.sr-ph-atc{border-radius:' + r + ' !important;}');
      css.push('.sr-ph-view{border-radius:' + r + ' !important;}');
    }
    if (s.accentColor) {
      var btn = s.buttonStyle || 'filled';
      if (btn === 'filled') {
        css.push('.sr-ph-atc{background:' + s.accentColor + ' !important;color:#fff !important;border-color:' + s.accentColor + ' !important;}');
      } else if (btn === 'outline') {
        css.push('.sr-ph-atc{background:transparent !important;color:' + s.accentColor + ' !important;border:1px solid ' + s.accentColor + ' !important;}');
      } else if (btn === 'text') {
        css.push('.sr-ph-atc{background:transparent !important;color:' + s.accentColor + ' !important;border:none !important;text-decoration:underline !important;}');
      }
      css.push('.sr-ph-view{border-color:' + s.accentColor + ' !important;color:' + s.accentColor + ' !important;}');
    }
    if (s.customCSS) css.push(s.customCSS);
    if (css.length > 0) {
      var existing = document.getElementById('sr-liquid-override');
      if (existing) existing.remove();
      var tag = document.createElement('style');
      tag.id = 'sr-liquid-override';
      tag.textContent = css.join('');
      document.body.appendChild(tag);
    }
    if (s.widgetTitle) {
      var subs = document.querySelectorAll('.sr-ph-popup-sub');
      for (var i = 0; i < subs.length; i++) subs[i].textContent = s.widgetTitle;
    }
  }

  // ── Save & Schedule Evaluation ──────────────────────────────

  saveSession(session);

  fetchConfigAndApplyStyles();

  setTimeout(function() {
    evaluateAndAct();
  }, EVALUATE_DELAY);

  if (META.pageType === 'product') {
    setTimeout(function() {
      session.evaluated = false;
      evaluateAndAct();
    }, 15000);
  }

  console.log('[SmartRec] Signal collector loaded — pageType:', META.pageType,
    '— views:', session.pageViews.length,
    '— backNav:', session.backNavCount,
    '— compare:', session.comparePattern,
    '— cartHesitation:', session.cartHesitation + 's');
})();
