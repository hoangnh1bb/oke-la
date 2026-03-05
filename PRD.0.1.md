MVP Build Brief
SmartRec — Intent-Based Product Discovery
Version 2.0  •  March 2026  •  For AI-Assisted Development


🎯  Core Philosophy
   "Không phải upsell engine. Không phải popup. Không phải discount bait.
    SmartRec đọc hành vi của shoppers trong thời gian thực để hiểu họ đang cần gì,
    rồi đưa ra đúng sản phẩm vào đúng khoảnh khắc họ cần nhất."


App Name
Stack
Build Target
Philosophy
Version
SmartRec
Shopify Remix + Polaris
6–8 giờ
Intent-first, not upsell-first
MVP v2.0


1. Product Philosophy — Tại Sao Intent-First?
1.1 Vấn đề với upsell-first approach
Rebuy, LimeSpot, Frequently Bought Together — tất cả đều nhìn bài toán từ góc merchant: "Làm sao tôi bán thêm?" Kết quả là những widget "You may also like" xuất hiện ở mọi nơi, mọi lúc, bất kể shopper đang ở giai đoạn nào trong hành trình mua hàng.
⚠️  Vấn đề thực sự:  Shopper không bỏ cart vì họ không muốn mua thêm.
   Họ bỏ cart vì họ chưa chắc sản phẩm đang xem có phải là thứ họ đang tìm không.
   → Đây là bài toán về product discovery, không phải upsell.

1.2 Intent-First là gì?
SmartRec nhìn bài toán từ góc shopper: "Người này đang cố tìm gì?" rồi dùng behavioral signals để trả lời câu hỏi đó và đưa ra sản phẩm phù hợp nhất.

Dimension
Upsell-First (Rebuy)
Intent-First (SmartRec)
Câu hỏi core
"Merchant muốn bán gì thêm?"
"Shopper đang cần gì lúc này?"
Khi nào trigger
Luôn luôn / theo vị trí cố định
Khi behavioral signal đủ mạnh
Logic chính
Co-occurrence / bestsellers
Real-time intent scoring
Metric thành công
AOV increase
Time-to-find-right-product giảm + conversion rate
Cảm giác với shopper
"App đang cố bán cho tôi"
"Store đang giúp tôi tìm đúng thứ"
Differentiation
Compete on features
Compete on philosophy

1.3 North Star Metric
   🎯  Time-to-right-product:
       Thời gian từ lúc shopper vào store đến lúc họ add đúng sản phẩm vào cart.
       App thành công = metric này giảm. Không phải AOV tăng. Không phải upsell click rate.
       (AOV tăng là side effect tự nhiên khi shopper tìm đúng sản phẩm nhanh hơn.)


2. Behavioral Signal Model
Đây là trái tim của SmartRec. Toàn bộ app xoay quanh việc thu thập, score, và act on các signals này.
2.1 Signal Taxonomy

Signal
Loại
Collect ở đâu
Weight
Ý nghĩa
time_on_product
Real-time
Product page — time tracking
⬆⬆⬆ Cao
Shopper đang cân nhắc nghiêm túc
scroll_depth
Real-time
Product page — scroll event
⬆⬆ Trung
Đọc description/reviews = high intent
review_hover
Real-time
Product page — hover trên review section
⬆⬆⬆ Cao
Đang verify trước khi quyết định
size_chart_open
Real-time
Product page — click size chart
⬆⬆⬆ Cao
Intent rõ ràng nhưng chưa chắc về variant
image_gallery_swipe
Real-time
Product page — gallery interaction
⬆ Thấp-Trung
Exploring, chưa committed
back_navigation
Real-time
History API — back button detect
⬆⬆⬆ Cao
Không satisfied với sản phẩm vừa xem
compare_pattern
Real-time
Session — xem ≥2 sản phẩm cùng loại
⬆⬆⬆ Cao
Đang so sánh, cần tiebreaker
cart_hesitation
Real-time
Cart page — time > 60s không checkout
⬆⬆ Trung
Uncertain về cart hiện tại
substitution_signal
Historical
Order history — xem A, mua B
⬆⬆⬆ Cao
B là alternative tốt hơn cho viewers của A
return_purchase
Historical
Order history — mua B sau khi mua A (30d)
⬆⬆ Trung
A và B complement nhau thật sự
view_to_purchase_rate
Historical
Aggregate — product level
⬆⬆ Trung
Sản phẩm nào convert tốt cho visitors tương tự
traffic_source_keyword
Contextual
URL params — UTM / search query
⬆⬆ Trung
Explicit intent từ search
returning_visitor
Contextual
localStorage — session count
⬆ Thấp
Higher purchase intent vs first visit
device_context
Contextual
navigator.userAgent
⬆ Thấp
Mobile evening = browse; Desktop morning = buy

2.2 Intent Score Calculation
Mỗi shopper trong mỗi session nhận một Intent Score (0–100) theo từng sản phẩm họ đang xem.

// Intent Score Algorithm (pseudo-code)


function calculateIntentScore(signals) {
  let score = 0;


  // Real-time signals (reset mỗi product page)
  if (signals.time_on_product > 60s)   score += 25;
  if (signals.time_on_product > 120s)  score += 15; // diminishing
  if (signals.scroll_depth > 70%)      score += 15;
  if (signals.review_hover)            score += 20;
  if (signals.size_chart_open)         score += 25;
  if (signals.image_gallery_swipe > 3) score += 10;


  // Navigation signals
  if (signals.back_navigation)         score -= 30; // Left this product
  if (signals.compare_pattern)         score += 20; // Comparing = serious


  // Contextual boosts
  if (signals.returning_visitor)       score += 10;
  if (signals.traffic_source_keyword)  score += 15;


  return Math.min(Math.max(score, 0), 100); // Clamp 0–100
}


2.3 Intent Score → Action Mapping
Dựa vào Intent Score, app quyết định CÓ hiển thị gì không, và nếu có thì hiển thị GÌ.

Intent Score
Stage
Signal đọc được
App action
Lý do
0–30
Browsing / Exploring
Mới vào, chưa engage
Không làm gì
Interrupt sớm = annoying
31–55
Considering
Scroll > 50%, xem ảnh
Hiện "Others also found helpful" — quiet sidebar suggestion
Nudge nhẹ, không aggressive
56–75
High Consideration
Đọc reviews, hover size chart
Hiện "Not sure? These are similar" — 2 alternative products
Họ muốn compare — giúp họ compare
76–89
Strong Intent
Xem > 90s + đọc reviews
Hiện "Shoppers with similar taste chose" — social proof + alt
Gần mua nhưng cần tiebreaker
90–100
Ready to Buy
Size chart + > 2min + scroll full
Không recommend sản phẩm khác — chỉ hiện variant selector nổi bật
Họ đã chọn rồi — đừng distract!
back_nav trigger
Rejected Product
Back button sau khi xem
Trên trang tiếp theo: hiện "You left [Product X] — still looking?" + better alt
Recover abandonment với context
   💡  Key insight:  Score 90–100 = KHÔNG hiển thị recommendation nào.
       Đây là ngược hoàn toàn với upsell logic.
       Khi shopper đã quyết định, recommendation = distraction = giảm conversion.


3. Use Cases — Intent-Driven Scenarios
3.1 UC-01: The Hesitating Shopper
Trigger: Score 56–75
Signal: review_hover + size_chart_open
Action: Show Alternatives


Field
Spec
Scenario
Shopper đang xem áo, mở size chart (không chắc size), hover vào reviews (không chắc chất lượng). Intent score leo lên 60–70. Họ đang cân nhắc nhưng có friction.
Signal threshold
size_chart_open = true AND review_hover_duration > 5s → trigger
App response
Hiện inline block dưới product description: "Không chắc chắn? Khách hàng với sở thích tương tự cũng xem những sản phẩm này" + 2 alternatives với size availability nổi bật
Key difference vs upsell
Không hiện higher-priced items. Hiện items có better fit cho người đang do dự về size/quality. Có thể cheaper.
UX
Inline, không popup. Dismiss bằng 1 click. Không re-trigger trong cùng session.
Success signal
Click vào alternative → add to cart (đây là conversion từ hesitation thành purchase)

3.2 UC-02: The Comparison Shopper
Trigger: compare_pattern
Signal: ≥2 products cùng category trong session
Action: Surface Tiebreaker


Field
Spec
Scenario
Shopper xem Product A (60s), navigate back, xem Product B (45s). Session history cho thấy họ đang so sánh 2 sản phẩm cùng loại.
Signal threshold
Xem ≥ 2 sản phẩm cùng product_type trong 1 session, mỗi sản phẩm time_on_product > 30s
App response
Khi shopper đang xem Product B: hiện floating comparison bar "You're also considering [Product A]" với 2–3 key differentiators (price diff, rating diff, review count diff)
Data cần
Price, rating, review count của 2 sản phẩm đang được compare (từ read_products)
Key difference vs upsell
Không giới thiệu sản phẩm thứ 3. Giúp họ QUYẾT ĐỊNH giữa 2 thứ họ đang cân nhắc. Mission là giảm paralysis, không tăng options.
UX
Thin comparison strip xuất hiện ở top của product page, dismissable
Success signal
Shopper add to cart từ trang hiện tại (bất kỳ product nào)

3.3 UC-03: The Lost Shopper
Trigger: back_nav pattern
Signal: Back button sau nhiều lần view
Action: Recovery Redirect


Field
Spec
Scenario
Shopper đã xem 4–5 sản phẩm nhưng không add gì vào cart. Cứ xem rồi back, xem rồi back. Đây là "lost shopper" — intent cao nhưng không tìm được đúng sản phẩm.
Signal threshold
back_navigation count ≥ 3 trong session + cart_items = 0 + session duration > 3 min
App response
Trigger nhẹ: hiện slide-in panel từ phải: "Bạn đang tìm gì? Thử lọc theo [tag1] / [tag2] / [tag3]" — tags được extract từ các sản phẩm họ đã xem trong session
Logic
Collect tags của tất cả sản phẩm đã xem trong session → find most common tags → surface như shortcuts
Key difference vs upsell
Không recommend sản phẩm cụ thể. Giúp shopper tự narrow down. Trao quyền cho họ, không manipulate.
UX
Slide-in panel từ phải (không che content), width 280px, dismissable. Chỉ trigger 1 lần/session.
Success signal
Shopper click tag filter → load filtered collection → add to cart

3.4 UC-04: The Cart Doubt Shopper
Trigger: cart_hesitation
Signal: Time in cart > 60s, chưa checkout
Action: Reassurance, không upsell


Field
Spec
Scenario
Shopper có item trong cart nhưng ngồi trên cart page > 60 giây không checkout. Họ đang doubt — về sản phẩm, về giá, hoặc về quyết định.
Signal threshold
Đang ở /cart hoặc cart drawer open + time > 60s + chưa click checkout
App response
Hiện trust nudges liên quan đến cart items: rating của sản phẩm ("4.8★ từ 234 reviews"), return policy ("Đổi trả miễn phí 30 ngày"), và nếu có: "X người khác đang xem sản phẩm này" (nếu data available)
Key difference vs upsell
KHÔNG hiện "Add more to qualify for free shipping" hay upsell. Giải quyết doubt về sản phẩm ĐANG trong cart.
UX
Inline dưới cart items, không cần interaction để hiện
Success signal
Click checkout sau khi nudge hiện

3.5 UC-05: Returning Customer — New Collection Guidance
Trigger: returning_visitor
Signal: Đã mua trước, quay lại
Action: Personalized Re-entry


Field
Spec
Scenario
Customer đã mua trước đây quay lại store. Họ không cần introduction — họ cần được dẫn thẳng tới thứ relevant với họ.
Signal
localStorage chứa product_ids của lần mua trước + customer_id nếu logged in
App response
Trên homepage: thay thế generic hero banner bằng "Welcome back! New arrivals in [category họ hay mua]" với 4 sản phẩm mới nhất trong category đó
Data cần
read_products (new arrivals last 30 days) + localStorage purchase history
Fallback
Nếu không có local history: không làm gì (không show generic "welcome back" vô nghĩa)
Key difference vs upsell
Personalized navigation, không phải upsell. Giúp returning customer tìm mới nhanh hơn.
Success signal
Click vào new arrival → thời gian từ homepage đến cart giảm vs non-personalized


4. Technical Specification
4.1 Architecture
Layer
Technology
Vai trò
Signal Collector
Vanilla JS (< 15KB) — inject qua Script Tags API
Thu thập behavioral events từ storefront. Async, non-blocking, zero impact on LCP.
Intent Engine
Node.js (Remix server route)
Nhận events, tính Intent Score, quyết định action cần trigger. Stateless per request.
Session Store
Browser localStorage + server-side KV (Upstash Redis free tier)
localStorage: real-time signals trong session. Redis: aggregate signals qua sessions (returning visitor).
Recommendation Data
Shopify Admin API (read_products + read_orders)
Tính substitution patterns và view→purchase rates. Cache 4 giờ per store.
Admin UI
Shopify Remix + Polaris
Merchant config + analytics dashboard.
Widget Renderer
Vanilla JS DOM injection
Render recommendation UI vào storefront. CSS variables từ theme.

4.2 Shopify API Permissions (Scopes)

Scope
Cần cho
Mandatory?
read_products
Lấy product data (title, price, image, tags, category) để render widgets và tính recommendations
✅ YES — v1
read_orders
Phân tích substitution patterns: "Người xem A nhưng mua B" + return purchase sequences
✅ YES — v1
write_script_tags
Inject signal-collector.js và widget-renderer.js vào storefront không cần edit theme
✅ YES — v1
read_customers
Check purchase history của returning logged-in customers (UC-05)
Optional — v1.1
read_analytics
Cross-validate conversion data (có thể dùng internal tracking thay thế)
Optional — v2


# shopify.app.toml
[access_scopes]
scopes = "read_products,read_orders,write_script_tags"


# Chỉ 3 scopes cho MVP — dễ merchant approve, dễ App Store review pass

4.3 Signal Collector Script (signal-collector.js)
Script này là core của app. Được inject qua Shopify Script Tags, chạy trên mọi page.

// signal-collector.js — Structure (inject via Shopify Script Tags)
// Bundle size target: < 15KB gzipped


(function SmartRecSignals() {
  const SESSION_KEY = "sr_session";
  const API_BASE    = "https://your-app.fly.dev";


  // ── Session state ──────────────────────────────────
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  session.pageViews   = session.pageViews   || [];
  session.backNavCount= session.backNavCount || 0;
  session.cartItems   = session.cartItems   || [];


  // ── Page detection ─────────────────────────────────
  const pageType = detectPageType(); // "product"|"cart"|"collection"|"home"


  // ── Signal collectors ──────────────────────────────
  if (pageType === "product") {
    const productId = getProductId(); // from meta[property="og:url"] or window.ShopifyAnalytics


    trackTimeOnPage(productId);         // setInterval every 10s
    trackScrollDepth(productId);        // scroll event listener
    trackElementHover(".review",        // hover events
      () => signal("review_hover", {productId}));
    trackElementClick(".size-chart, [data-size-chart]",
      () => signal("size_chart_open", {productId}));
    trackImageGallery(productId);       // touchstart / click on gallery


    // Back navigation detection
    window.addEventListener("pagehide", () => {
      if (performance.navigation?.type === 2 || history.state?.from === productId)
        signal("back_nav", {productId});
    });
  }


  if (pageType === "cart") {
    trackCartHesitation(); // > 60s on cart page without checkout click
  }


  // ── Score + act ────────────────────────────────────
  async function evaluateAndAct() {
    const score  = calculateIntentScore(session);
    const action = await fetch(`${API_BASE}/api/intent`, {
      method: "POST",
      body: JSON.stringify({ session, score, pageType, shop: Shopify.shop })
    }).then(r => r.json());


    if (action.type !== "none") renderAction(action);
  }


  // Evaluate 5s after page load (let user settle first)
  setTimeout(evaluateAndAct, 5000);
  // Re-evaluate on significant signal changes
  session.onSignalChange = evaluateAndAct;


  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
})()

4.4 Intent API Endpoint

// POST /api/intent
// Input: { session, score, pageType, shop }
// Output: { type, data }


export async function action({ request }) {
  const { session, score, pageType, shop } = await request.json();


  // Rule engine — intent score → action
  if (score < 30) return json({ type: "none" });


  if (pageType === "product") {
    const productId = session.currentProduct;


    // UC-02: Compare pattern
    if (session.comparePattern && session.pageViews.length >= 2) {
      const prev = session.pageViews[session.pageViews.length - 2];
      return json({ type: "comparison_bar", data: { productA: prev, productB: productId } });
    }


    // UC-01: Hesitation
    if (score >= 56 && score <= 89 && session.sizeChartOpen) {
      const alts = await getAlternatives(productId, shop);
      return json({ type: "alternative_nudge", data: { products: alts } });
    }
  }


  // UC-03: Lost shopper
  if (session.backNavCount >= 3 && session.cartItems.length === 0) {
    const tags = extractCommonTags(session.pageViews, shop);
    return json({ type: "tag_navigator", data: { tags } });
  }


  // UC-04: Cart doubt
  if (pageType === "cart" && session.cartHesitation > 60) {
    const trust = await getTrustSignals(session.cartItems, shop);
    return json({ type: "trust_nudge", data: trust });
  }


  return json({ type: "none" });
}

4.5 File Structure
smartrec-app/
├── app/
│   ├── routes/
│   │   ├── app._index.jsx            # Dashboard home
│   │   ├── app.settings.jsx          # Widget config + signal thresholds
│   │   ├── app.analytics.jsx         # Metrics + session insights
│   │   ├── api.intent.js             # POST — core intent engine
│   │   ├── api.alternatives.js       # GET — fetch alternative products
│   │   ├── api.track.js              # POST — log actions taken
│   │   └── api.config.js             # GET/POST — merchant settings
│   ├── lib/
│   │   ├── intent-engine.server.js   # Score → action decision logic
│   │   ├── substitution.server.js    # Build substitution map from orders
│   │   ├── shopify.server.js         # Shopify API wrapper
│   │   └── redis.server.js           # Session + cache layer
│   └── root.jsx
├── public/
│   ├── signal-collector.js           # Injected via Script Tags (< 15KB)
│   └── widget-renderer.js            # UI components for each action type
├── shopify.app.toml
└── package.json


5. UI Component Spec (Widget Renderer)
Mỗi action type từ Intent Engine tương ứng với một UI component. Tất cả inject vào storefront qua DOM manipulation, không cần edit theme.
5.1 Component: alternative_nudge
Property
Spec
Tên
"Not sure? Others with similar taste chose:"
Position
Inline dưới product description, trước add-to-cart button
Size
Full width, 2 product cards (không phải 4 — ít lựa chọn hơn = ít paralysis)
Product card
Image 80×80 + Title (max 1 line) + Price + "View" button
Trigger
Fade-in sau 3s khi score đạt threshold (không pop ngay)
Dismiss
X button top-right — ghi nhớ trong localStorage, không re-show trong session
Tone
Helper, không pushy. Copy: "Not sure?" chứ không "You'll love this too!"

5.2 Component: comparison_bar
Property
Spec
Tên
"You're also considering [Product A]"
Position
Sticky thin strip ở bottom của product page (height 60px). Không che content.
Content
Product A thumbnail + tên rút gọn + 2 quick stats (e.g., "$5 cheaper" / "0.3★ higher rated") + "Compare" button
Trigger
Chỉ hiện khi có compare_pattern signal trong session
Action
"Compare" → expand thành comparison panel (slide-up) với side-by-side specs
Dismiss
X button — không re-show trong session

5.3 Component: tag_navigator
Property
Spec
Tên
"Still looking? Try filtering by:"
Position
Slide-in panel từ right edge (width 260px), không che content chính
Content
3–4 tag buttons được extract từ products đã xem trong session + close button
Tag logic
Lấy tất cả tags từ products đã xem → đếm frequency → lấy top 3 tags khác với current page
Action
Click tag → navigate đến /collections/all?filter.p.tag=[tag]
Trigger
Chỉ sau back_nav ≥ 3 + cart empty + session duration > 3min

5.4 Component: trust_nudge
Property
Spec
Tên
Không có headline — chỉ là context information dưới cart items
Position
Dưới cart item list, trên total/checkout button
Content
Per item: rating stars + review count + return policy badge. Không thêm sản phẩm mới.
Trigger
Sau 60s trên cart page không có action
Tone
Reassurance, không pressure. Không countdown timer. Không "Only 2 left!"

5.5 Design Principles (tất cả components)
Fade-in, không pop: Mọi component xuất hiện bằng 300ms opacity transition. Không scale-up, không bounce.
Luôn có dismiss: X button visible ngay. Không cần scroll để tìm.
Zero intrusion: Không modal, không overlay, không block content.
Theme-aware: CSS variables inherit từ theme (font, color, border-radius).
Mobile-first: Test trên 375px trước. Desktop là secondary.
Silent khi không chắc: Nếu score thấp hoặc data không đủ → không hiện gì. Silence > wrong recommendation.

6. Build Plan (6–8 giờ)
Phase
Task
Giờ
Output cụ thể
P1 — Foundation
Shopify app scaffold: Remix init + OAuth + shopify.app.toml (3 scopes)
0.5h
App install được trên dev store
P1 — Foundation
Shopify API service: fetchProducts(), fetchOrders(), getSubstitutionMap()
0.5h
Substitution map chạy được với real store data
P2 — Signal Layer
signal-collector.js: time tracking, scroll depth, hover, back-nav, cart hesitation
1.5h
Script inject được, events log ra console
P2 — Signal Layer
Intent score calculator: calculateIntentScore(signals) với tất cả signal weights
0.5h
Score tính đúng với test cases
P3 — Intent Engine
POST /api/intent: nhận session state, return action type + data
1.0h
API trả về đúng action cho mỗi UC
P3 — Intent Engine
GET /api/alternatives: substitution-based + tag-based fallback
0.5h
API trả về 2 alternatives cho bất kỳ product
P4 — Widgets
widget-renderer.js: 4 components (alternative_nudge, comparison_bar, tag_navigator, trust_nudge)
1.5h
Tất cả 4 widgets render đúng trên storefront
P5 — Admin
Dashboard: signal threshold config, enable/disable per UC, basic analytics (actions triggered / clicks)
1.0h
Merchant có thể điều chỉnh thresholds
P6 — Polish
Mobile responsive, fade-in animations, localStorage session management, error handling
0.5h
Production-ready


   📋  Starter prompt cho AI coding assistant:
       "Build a Shopify app called SmartRec using Remix framework and Shopify Polaris UI.
        This is NOT an upsell app. It detects shopper behavioral intent in real-time and
        shows contextual product suggestions only when behavioral signals indicate the shopper
        hasn't found the right product yet.
        Start with Phase 1: scaffold the app, OAuth flow, shopify.app.toml with scopes:
        read_products, read_orders, write_script_tags.
        Then build a signal-collector.js script that tracks: time_on_page, scroll_depth,
        review_hover, size_chart_open, back_navigation, cart_hesitation.
        Each signal contributes to an Intent Score (0-100). Score 90+ = do nothing."


7. Acceptance Criteria
#
Criteria
Test
Priority
F-01
Intent Score tính đúng theo signal weights
Unit test: open size chart → score ≥ 56
MUST
F-02
Score < 30 → không hiện widget nào
Mới vào page, không interact → không có DOM injection
MUST
F-03
Score 90–100 → không hiện recommendation (!)
Xem product > 3min + đọc hết → không có widget
MUST
F-04
UC-01: alternative_nudge hiện khi size_chart_open + score 56–75
Click size chart → đợi 5s → widget fade in
MUST
F-05
UC-02: comparison_bar hiện sau khi xem 2+ products cùng type
View A → back → view B → strip hiện ở bottom
MUST
F-06
UC-03: tag_navigator hiện sau 3 back navigations + cart empty
Back 3 lần → slide-in panel xuất hiện từ right
MUST
F-07
UC-04: trust_nudge hiện sau 60s trên cart page
Ở cart page, không làm gì 60s → trust signals appear
MUST
F-08
All widgets dismissable + không re-show trong session
Dismiss → reload page → widget không xuất hiện lại
MUST
F-09
Script không block page render (async injection)
Lighthouse test → không có render-blocking resources từ app
MUST
F-10
Merchant có thể điều chỉnh score thresholds từ admin
Change threshold 56→70 → UC-01 chỉ trigger muộn hơn
SHOULD
F-11
Mobile: tất cả widgets usable trên 375px
Test trên Chrome DevTools iPhone SE → không overflow
MUST
F-12
Zero widget hiện trên trang checkout (không distract)
Navigate đến /checkout → không có SmartRec DOM
MUST

8. Out of Scope (v1)
Feature
Defer lý do
Phase
Server-side ML model (collaborative filtering)
Cần volume data lớn. Rule-based đủ tốt cho MVP.
v2
A/B testing framework
Cần experiment infra. Ship first, test later.
v2
Email triggers dựa trên intent signals
Cần Klaviyo/email integration. Out of storefront scope.
v2
Cross-session intent memory (ngoài localStorage)
Cần server-side user identity. Privacy implications.
v1.1
Merchant-customizable widget copy
Hardcode English cho v1. i18n sau.
v1.1
Real-time inventory signal ("low stock")
Không dùng scarcity/pressure tactics — trái với philosophy.
Có thể không làm
Upsell / "buy more save more" logic
Trái với product philosophy. SmartRec không phải upsell app.
Không bao giờ trong v1



