/**
 * SmartRec Signal Collector
 * Tracks behavioral signals on storefront, computes intent score,
 * POSTs to Intent Engine, and triggers widget rendering.
 *
 * Flow: collect signals -> compute score -> POST /apps/smartrec/intent -> SmartRecRender(action)
 *
 * Server expects SignalPayload: { sessionId, shop, score, pageType, signals,
 *   viewedProducts, currentProduct, cartProductIds, backNavCount }
 */
(function SmartRecSignals() {
  'use strict';

  // Prevent multiple executions (script may load from embed + section blocks)
  if (window.__smartrecSignalLoaded) return;
  window.__smartrecSignalLoaded = true;

  var META = window.SmartRecMeta;
  if (!META || !META.enableTracking) return;
  if (/\/checkout/i.test(window.location.pathname)) return;

  // ── Config ────────────────────────────────────────────────────
  var SESSION_KEY = 'sr_session';
  var EVAL_DELAY = 5000;       // ms before first evaluation
  var MAX_PAGE_VIEWS = 20;     // cap stored page views

  // ── Session persistence ───────────────────────────────────────

  function loadSession() {
    try {
      var raw = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      // Expire sessions older than 30 min of inactivity
      if (raw.lastActivity && Date.now() - raw.lastActivity > 30 * 60 * 1000) {
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
    } catch (e) { /* quota exceeded — silent */ }
  }

  // ── Initialize session ────────────────────────────────────────

  var session = loadSession();
  session.startedAt = session.startedAt || Date.now();
  session.pageViews = session.pageViews || [];
  session.backNavCount = session.backNavCount || 0;
  session.cartItems = session.cartItems || [];

  // Track current product with full context for UC handlers
  session.viewedProducts = session.viewedProducts || [];

  var currentProductId = META.productId ? String(META.productId) : null;
  var currentProduct = null;

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

    // Add to viewedProducts if not the last viewed
    var lastViewed = session.viewedProducts[session.viewedProducts.length - 1];
    if (!lastViewed || lastViewed.id !== currentProductId) {
      session.viewedProducts.push(currentProduct);
      if (session.viewedProducts.length > MAX_PAGE_VIEWS) {
        session.viewedProducts = session.viewedProducts.slice(-MAX_PAGE_VIEWS);
      }
    }

    // Also maintain simple pageViews array (product IDs)
    var lastViewedId = session.pageViews[session.pageViews.length - 1];
    if (lastViewedId !== currentProductId) {
      session.pageViews.push(currentProductId);
      if (session.pageViews.length > MAX_PAGE_VIEWS) {
        session.pageViews = session.pageViews.slice(-MAX_PAGE_VIEWS);
      }
    }
  }

  // ── Signal: Back navigation detection ─────────────────────────
  // performance.navigation.type === 2 means back/forward
  // Also check if referrer is same origin (user came back from another product page)

  var isBackNav = false;
  if (typeof performance !== 'undefined' && performance.navigation) {
    isBackNav = performance.navigation.type === 2;
  }
  // Modern API fallback
  if (!isBackNav && typeof performance !== 'undefined' && performance.getEntriesByType) {
    var navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
      isBackNav = true;
    }
  }
  if (isBackNav) {
    session.backNavCount = (session.backNavCount || 0) + 1;
  }

  // ── Signal: Compare pattern ───────────────────────────────────
  // If user has viewed 2+ products and navigated back at least once

  session.comparePattern = session.pageViews.length >= 2 && session.backNavCount >= 1;

  // ── Signal trackers (async, accumulate over time) ─────────────

  var signals = {
    timeOnPage: 0,
    scrollDepth: 0,
    reviewHover: false,
    sizeChartOpen: false,
    imageGallerySwipes: 0
  };

  // Time on page — update every second
  var pageStartTime = Date.now();
  var timeInterval = setInterval(function() {
    signals.timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
  }, 1000);

  // Scroll depth — track max scroll percentage
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

  // Review section hover
  function detectReviewHover() {
    var reviewSelectors = [
      '.spr-container', '.yotpo', '.judge-me', '[data-reviews]',
      '.product-reviews', '#shopify-product-reviews', '.stamped-reviews',
      '.loox-reviews', '.rivyo-reviews'
    ];
    for (var i = 0; i < reviewSelectors.length; i++) {
      var el = document.querySelector(reviewSelectors[i]);
      if (el) {
        el.addEventListener('mouseenter', function() {
          signals.reviewHover = true;
        }, { once: true });
        return;
      }
    }
  }

  // Size chart open detection
  function detectSizeChart() {
    var sizeChartSelectors = [
      '[data-size-chart]', '.size-chart', '.size-guide',
      'a[href*="size"]', 'button[data-size-chart]'
    ];
    for (var i = 0; i < sizeChartSelectors.length; i++) {
      var el = document.querySelector(sizeChartSelectors[i]);
      if (el) {
        el.addEventListener('click', function() {
          signals.sizeChartOpen = true;
          session.sizeChartOpen = true;
        }, { once: true });
        return;
      }
    }
  }

  // Image gallery swipe/click counting
  function detectImageSwipes() {
    var gallerySelectors = [
      '.product__media-list', '.product-single__photos',
      '.product-gallery', '[data-product-media-gallery]',
      '.product__media-container', '.product-images'
    ];
    for (var i = 0; i < gallerySelectors.length; i++) {
      var el = document.querySelector(gallerySelectors[i]);
      if (el) {
        el.addEventListener('click', function() {
          signals.imageGallerySwipes++;
        });
        // Touch swipe detection
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

  // Initialize DOM-dependent signal detectors after DOM ready
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
  // Intent score 0-100 based on weighted signals

  function computeScore() {
    var score = 0;

    // Time on page (max 20 points) — more time = higher consideration
    var timePts = Math.min(signals.timeOnPage / 3, 20);
    score += timePts;

    // Scroll depth (max 15 points) — deeper scroll = more engaged
    score += (signals.scrollDepth / 100) * 15;

    // Image gallery interaction (max 10 points)
    score += Math.min(signals.imageGallerySwipes * 3, 10);

    // Review hover (5 points) — checking social proof = considering
    if (signals.reviewHover) score += 5;

    // Size chart (8 points) — checking fit = high purchase intent
    if (signals.sizeChartOpen) score += 8;

    // Multiple product views (max 15 points) — browsing behavior
    var viewCount = session.pageViews ? session.pageViews.length : 0;
    score += Math.min(viewCount * 5, 15);

    // Compare pattern (10 points) — actively comparing = at least "considering"
    if (session.comparePattern) score += 10;

    // Back navigation signal (adds uncertainty/intent)
    if (session.backNavCount >= 3) {
      // Lost shopper — high uncertainty
      score += 12;
    } else if (session.backNavCount >= 1) {
      // Comparing — moderate signal
      score += 8;
    }

    // Returning visitor (5 points)
    if (session.startedAt && Date.now() - session.startedAt > 5 * 60 * 1000) {
      score += 5;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ── Intent API call ───────────────────────────────────────────

  var evaluated = false;

  function evaluateAndRender() {
    if (evaluated) return;
    evaluated = true;

    session.sessionDuration = Math.round((Date.now() - session.startedAt) / 1000);
    saveSession(session);

    var score = computeScore();

    // Score < 30: browsing, server returns none anyway — skip network call
    if (score < 30) {
      console.log('[SmartRec] Score too low (' + score + '), skipping intent call');
      return;
    }

    // Build SignalPayload matching server's expected shape
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
        comparePattern: !!session.comparePattern,
        returningVisitor: session.viewedProducts.length > 1,
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
      if (window.SmartRecRender) {
        window.SmartRecRender(action);
      }
      // Track impression
      if (action.type && action.type !== 'none') {
        trackEvent('impression', action.type, score);
      }
    })
    .catch(function(err) {
      console.warn('[SmartRec] Intent call failed:', err.message);
    });
  }

  // ── Analytics tracking ────────────────────────────────────────

  function trackEvent(eventType, widgetType, intentScore) {
    var trackPayload = {
      shop: META.shopDomain,
      sessionId: session.startedAt ? String(session.startedAt) : '',
      eventType: eventType,
      widgetType: widgetType,
      intentScore: intentScore
    };

    // Fire and forget — don't block UI
    try {
      fetch(META.appProxy + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackPayload)
      }).catch(function() { /* silent */ });
    } catch (e) { /* silent */ }
  }

  // ── Trigger evaluation ────────────────────────────────────────
  // Product pages: evaluate after EVAL_DELAY (5s)
  // Cart pages: first check at EVAL_DELAY, then re-evaluate after 65s for hesitation

  setTimeout(evaluateAndRender, EVAL_DELAY);

  // Also re-evaluate on visibility change (user returns to tab)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && !evaluated) {
      // User returned — might have been comparing in another tab
      session.comparePattern = true;
      saveSession(session);
    }
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', function() {
    clearInterval(timeInterval);
    window.removeEventListener('scroll', onScroll);
    saveSession(session);
  });

  console.log('[SmartRec] Signal collector loaded — pageType:', META.pageType,
    '| products viewed:', (session.pageViews || []).length,
    '| backNav:', session.backNavCount);
})();
