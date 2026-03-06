/**
 * SmartRec Signal Collector
 * Tracks behavioral signals on storefront, computes intent score,
 * POSTs to Intent Engine ONCE, and triggers widget rendering.
 *
 * Flow: collect signals -> wait EVAL_DELAY -> compute score ONCE
 *       -> POST /apps/smartrec/intent -> SmartRecRender(action)
 *
 * Scoring rules:
 * - Score = current page engagement ONLY (no session accumulation in score)
 * - ONE evaluation per page load (no re-evaluation, no score climbing)
 * - Session data (viewedProducts, backNavCount) still sent for UC handler logic
 */
(function SmartRecSignals() {
  'use strict';

  if (window.__smartrecSignalLoaded) return;
  window.__smartrecSignalLoaded = true;

  var META = window.SmartRecMeta;
  if (!META || !META.enableTracking) return;
  if (/\/checkout/i.test(window.location.pathname)) return;

  // ── Config ────────────────────────────────────────────────────
  var SESSION_KEY = 'sr_session';
  var EVAL_DELAY = 8000;       // ms before single evaluation
  var MAX_PAGE_VIEWS = 20;

  // ── Session persistence ───────────────────────────────────────

  function isNewVisit() {
    // New visit if: no referrer, referrer from different origin, or typed URL
    var ref = document.referrer;
    if (!ref) return true;
    try {
      var refHost = new URL(ref).hostname;
      if (refHost !== window.location.hostname) return true;
    } catch (e) { return true; }
    return false;
  }

  function loadSession() {
    try {
      var raw = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      // Expire sessions older than 30 min of inactivity
      if (raw.lastActivity && Date.now() - raw.lastActivity > 30 * 60 * 1000) {
        return {};
      }
      // Reset session on new visit (typed URL, external link, bookmark)
      if (isNewVisit() && raw.startedAt) {
        return {};
      }
      return raw;
    } catch (e) {
      return {};
    }
  }

  function saveSession(s) {
    s.lastActivity = Date.now();
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch (e) { /* quota exceeded */ }
  }

  // ── Initialize session ────────────────────────────────────────

  var session = loadSession();
  session.startedAt = session.startedAt || Date.now();
  session.pageViews = session.pageViews || [];
  session.backNavCount = session.backNavCount || 0;
  session.cartItems = session.cartItems || [];
  session.viewedProducts = session.viewedProducts || [];

  var currentProductId = META.productId ? String(META.productId) : null;
  var currentProduct = null;

  // Per-page: is the user returning to a product they already viewed?
  var isReturningToProduct = false;

  if (currentProductId && currentProductId !== 'null') {
    currentProduct = {
      id: currentProductId,
      type: META.productType || '',
      tags: Array.isArray(META.productTags) ? META.productTags : [],
      title: META.productTitle || '',
      price: META.productPrice ? String(META.productPrice) : '',
      image: META.productImage || '',
      url: META.productHandle ? '/products/' + META.productHandle : '',
      timestamp: Date.now()
    };

    // Check if this product was already viewed earlier in session
    for (var vi = 0; vi < session.pageViews.length; vi++) {
      if (session.pageViews[vi] === currentProductId) {
        isReturningToProduct = true;
        break;
      }
    }

    // Add to viewedProducts if not the last viewed
    var lastViewed = session.viewedProducts[session.viewedProducts.length - 1];
    if (!lastViewed || lastViewed.id !== currentProductId) {
      session.viewedProducts.push(currentProduct);
      if (session.viewedProducts.length > MAX_PAGE_VIEWS) {
        session.viewedProducts = session.viewedProducts.slice(-MAX_PAGE_VIEWS);
      }
    }

    // Maintain simple pageViews array (product IDs)
    var lastViewedId = session.pageViews[session.pageViews.length - 1];
    if (lastViewedId !== currentProductId) {
      session.pageViews.push(currentProductId);
      if (session.pageViews.length > MAX_PAGE_VIEWS) {
        session.pageViews = session.pageViews.slice(-MAX_PAGE_VIEWS);
      }
    }
  }

  // ── Signal: Back navigation detection (per-page) ──────────────
  var isBackNav = false;
  if (typeof performance !== 'undefined' && performance.navigation) {
    isBackNav = performance.navigation.type === 2;
  }
  if (!isBackNav && typeof performance !== 'undefined' && performance.getEntriesByType) {
    var navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
      isBackNav = true;
    }
  }
  if (isBackNav) {
    session.backNavCount = (session.backNavCount || 0) + 1;
  }

  // Compare pattern: returned to a previously viewed product via back-nav (per-page, not sticky)
  var isComparePattern = isReturningToProduct && isBackNav;

  // ── Signal trackers (accumulate until single evaluation) ──────

  var signals = {
    timeOnPage: 0,
    scrollDepth: 0,
    reviewHover: false,
    sizeChartOpen: false,
    imageGallerySwipes: 0
  };

  var pageStartTime = Date.now();
  var timeInterval = setInterval(function() {
    signals.timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
  }, 1000);

  var maxScroll = 0;
  function onScroll() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    ) - window.innerHeight;
    if (docHeight > 0) {
      var pct = Math.round((scrollTop / docHeight) * 100);
      if (pct > maxScroll) maxScroll = pct;
      signals.scrollDepth = maxScroll;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  function detectReviewHover() {
    var selectors = [
      '.spr-container', '.yotpo', '.judge-me', '[data-reviews]',
      '.product-reviews', '#shopify-product-reviews', '.stamped-reviews',
      '.loox-reviews', '.rivyo-reviews'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        el.addEventListener('mouseenter', function() { signals.reviewHover = true; }, { once: true });
        return;
      }
    }
  }

  function detectSizeChart() {
    var selectors = [
      '[data-size-chart]', '.size-chart', '.size-guide',
      'a[href*="size"]', 'button[data-size-chart]'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        el.addEventListener('click', function() { signals.sizeChartOpen = true; }, { once: true });
        return;
      }
    }
  }

  function detectImageSwipes() {
    var selectors = [
      '.product__media-list', '.product-single__photos',
      '.product-gallery', '[data-product-media-gallery]',
      '.product__media-container', '.product-images'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        el.addEventListener('click', function() { signals.imageGallerySwipes++; });
        var touchStartX = 0;
        el.addEventListener('touchstart', function(e) {
          touchStartX = e.touches[0].clientX;
        }, { passive: true });
        el.addEventListener('touchend', function(e) {
          var diff = Math.abs(e.changedTouches[0].clientX - touchStartX);
          if (diff > 30) signals.imageGallerySwipes++;
        }, { passive: true });
        return;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDomSignals);
  } else {
    initDomSignals();
  }

  function initDomSignals() {
    if (META.pageType === 'product') {
      detectReviewHover();
      detectSizeChart();
      detectImageSwipes();
    }
  }

  // ── Score computation ─────────────────────────────────────────
  // Total of all signals in current session. Computed ONCE per page load.
  // Session resets on new visit (external link, typed URL, 30min inactivity).
  // Max theoretical = 100.

  function computeScore() {
    var score = 0;

    // --- Per-page engagement (max 60) ---

    // Time on page: 2pt per second, max 20
    score += Math.min(signals.timeOnPage * 2, 20);

    // Scroll depth: max 15
    score += Math.round((signals.scrollDepth / 100) * 15);

    // Image gallery: 3pt per interaction, max 8
    score += Math.min(signals.imageGallerySwipes * 3, 8);

    // Review hover: 7 — checking social proof
    if (signals.reviewHover) score += 7;

    // Size chart: 10 — checking fit = high purchase intent
    if (signals.sizeChartOpen) score += 10;

    // --- Session context (max 40) ---

    // Unique product views in session: 2→5, 3→10, 4+→15
    var seen = {};
    var uniqueViews = 0;
    if (session.pageViews) {
      for (var ui = 0; ui < session.pageViews.length; ui++) {
        if (!seen[session.pageViews[ui]]) {
          seen[session.pageViews[ui]] = true;
          uniqueViews++;
        }
      }
    }
    if (uniqueViews >= 4) score += 15;
    else if (uniqueViews >= 3) score += 10;
    else if (uniqueViews >= 2) score += 5;

    // Navigation intent (mutually exclusive — pick highest):
    // Compare pattern (A→B→A via back-nav) → 15
    // Lost browsing (backNav >= 3) → 12
    // Some back navigation (backNav >= 1) → 6
    if (isComparePattern) {
      score += 15;
    } else if (session.backNavCount >= 3) {
      score += 12;
    } else if (session.backNavCount >= 1) {
      score += 6;
    }

    // Returning to a previously viewed product (not via back-nav): 5
    if (isReturningToProduct && !isComparePattern) {
      score += 5;
    }

    // Session duration > 3 min: 5
    if (session.startedAt && Date.now() - session.startedAt > 3 * 60 * 1000) {
      score += 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ── Intent API call (SINGLE execution per page load) ──────────

  var evaluated = false;

  function evaluateOnce() {
    if (evaluated) return;
    evaluated = true;

    saveSession(session);

    var score = computeScore();

    if (score < 30) {
      console.log('[SmartRec] Score', score, '— below threshold, no intent call');
      return;
    }

    var payload = {
      sessionId: String(session.startedAt || Date.now()),
      shop: META.shopDomain || '',
      score: score,
      pageType: META.pageType || '',
      signals: {
        timeOnProduct: signals.timeOnPage,
        scrollDepth: signals.scrollDepth,
        reviewHover: signals.reviewHover,
        sizeChartOpen: signals.sizeChartOpen,
        imageGallerySwipes: signals.imageGallerySwipes,
        backNavigation: isBackNav,
        cartHesitation: 0,
        comparePattern: isComparePattern,
        returningVisitor: isReturningToProduct,
        trafficSourceKeyword: false
      },
      viewedProducts: session.viewedProducts || [],
      currentProduct: currentProduct,
      cartProductIds: (session.cartItems || []).map(function(id) { return String(id); }),
      backNavCount: session.backNavCount || 0
    };

    console.log('[SmartRec] Evaluating intent — score:', score, 'pageType:', META.pageType);

    fetch(META.appProxy + '/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(action) {
      console.log('[SmartRec] Intent response:', action.type);
      if (action.type && action.type !== 'none') {
        if (window.SmartRecRender) {
          window.SmartRecRender(action);
        }
        trackEvent('impression', action.type, score);
      }
    })
    .catch(function(err) {
      console.warn('[SmartRec] Intent call failed:', err.message);
    });
  }

  // ── Analytics tracking ────────────────────────────────────────

  function trackEvent(eventType, widgetType, intentScore) {
    try {
      fetch(META.appProxy + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: META.shopDomain,
          sessionId: session.startedAt ? String(session.startedAt) : '',
          eventType: eventType,
          widgetType: widgetType,
          intentScore: intentScore
        })
      }).catch(function() { /* silent */ });
    } catch (e) { /* silent */ }
  }

  // ── Single evaluation after delay ─────────────────────────────
  setTimeout(evaluateOnce, EVAL_DELAY);

  // Cleanup on unload
  window.addEventListener('beforeunload', function() {
    clearInterval(timeInterval);
    window.removeEventListener('scroll', onScroll);
    saveSession(session);
  });

  var _seen = {};
  var _uniqueCount = 0;
  for (var _ui = 0; _ui < (session.pageViews || []).length; _ui++) {
    if (!_seen[session.pageViews[_ui]]) { _seen[session.pageViews[_ui]] = true; _uniqueCount++; }
  }
  console.log('[SmartRec] Signal collector loaded — pageType:', META.pageType,
    '| unique products:', _uniqueCount,
    '| total views:', (session.pageViews || []).length,
    '| backNav:', session.backNavCount);
})();
