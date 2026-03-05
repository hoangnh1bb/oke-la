/**
 * SmartRec Signal Collector — Stub
 * Tracks behavioral signals on storefront and calls Intent Engine.
 * Real implementation in separate plan (Signal Collector + Intent Engine).
 *
 * This stub demonstrates the integration point with widget-renderer.js:
 * 1. Collect signals → 2. POST to /apps/smartrec/intent → 3. Call SmartRecRender()
 */
(function SmartRecSignals() {
  'use strict';

  var META = window.SmartRecMeta;
  if (!META || !META.enableTracking) return;
  if (/\/checkout/i.test(window.location.pathname)) return;

  var SESSION_KEY = 'sr_session';

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) { /* silent */ }
  }

  var session = loadSession();
  session.pageViews = session.pageViews || [];
  session.startedAt = session.startedAt || Date.now();

  if (META.pageType === 'product' && META.productId) {
    session.currentProduct = META.productId;
    if (session.pageViews.indexOf(META.productId) === -1) {
      session.pageViews.push(META.productId);
    }
  }

  saveSession(session);

  // Integration point: when Intent Engine is ready, this function
  // will POST session + signals to /apps/smartrec/intent and
  // call window.SmartRecRender() with the response.
  //
  // Example flow (to be implemented):
  //
  // async function evaluateAndAct() {
  //   var response = await fetch(META.appProxy + '/intent', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ session: session, pageType: META.pageType })
  //   });
  //   var action = await response.json();
  //   if (window.SmartRecRender) window.SmartRecRender(action);
  // }
  //
  // setTimeout(evaluateAndAct, 5000);

  console.log('[SmartRec] Signal collector loaded — pageType:', META.pageType,
    '— products viewed:', session.pageViews.length);
})();
