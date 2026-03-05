import { useEffect, useState, useCallback } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

// ── Loader ─────────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await db.smartRecSettings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await db.smartRecSettings.create({ data: { shop } });
  }

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    imp7, imp30,
    atc7, atc30,
    rev7Agg, rev30Agg,
    topProducts7, topProducts30,
    recentEvents,
  ] = await Promise.all([
    db.smartRecEvent.count({
      where: { shop, eventType: "impression", createdAt: { gte: d7 } },
    }),
    db.smartRecEvent.count({
      where: { shop, eventType: "impression", createdAt: { gte: d30 } },
    }),
    db.smartRecEvent.count({
      where: { shop, eventType: "widget_atc", createdAt: { gte: d7 } },
    }),
    db.smartRecEvent.count({
      where: { shop, eventType: "widget_atc", createdAt: { gte: d30 } },
    }),
    db.smartRecEvent.aggregate({
      where: { shop, eventType: "widget_atc", createdAt: { gte: d7 } },
      _sum: { value: true },
    }),
    db.smartRecEvent.aggregate({
      where: { shop, eventType: "widget_atc", createdAt: { gte: d30 } },
      _sum: { value: true },
    }),
    db.smartRecEvent.groupBy({
      by: ["productId"],
      where: {
        shop,
        eventType: "impression",
        productId: { not: null },
        createdAt: { gte: d7 },
      },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
    db.smartRecEvent.groupBy({
      by: ["productId"],
      where: {
        shop,
        eventType: "impression",
        productId: { not: null },
        createdAt: { gte: d30 },
      },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
    db.smartRecEvent.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { eventType: true, widgetType: true, productId: true, value: true, createdAt: true },
    }),
  ]);

  const atcByProduct7 = await db.smartRecEvent.groupBy({
    by: ["productId"],
    where: { shop, eventType: "widget_atc", productId: { not: null }, createdAt: { gte: d7 } },
    _count: true,
  });
  const atcByProduct30 = await db.smartRecEvent.groupBy({
    by: ["productId"],
    where: { shop, eventType: "widget_atc", productId: { not: null }, createdAt: { gte: d30 } },
    _count: true,
  });

  const atcMap7: Record<string, number> = {};
  atcByProduct7.forEach((c) => { if (c.productId) atcMap7[c.productId] = c._count; });
  const atcMap30: Record<string, number> = {};
  atcByProduct30.forEach((c) => { if (c.productId) atcMap30[c.productId] = c._count; });

  return {
    settings,
    analytics: {
      impressions7: imp7,
      impressions30: imp30,
      clicks7: atc7,
      clicks30: atc30,
      revenue7: rev7Agg._sum.value || 0,
      revenue30: rev30Agg._sum.value || 0,
      topProducts7: topProducts7.map((p) => ({
        productId: p.productId || "unknown",
        impressions: p._count,
        clicks: atcMap7[p.productId || ""] || 0,
      })),
      topProducts30: topProducts30.map((p) => ({
        productId: p.productId || "unknown",
        impressions: p._count,
        clicks: atcMap30[p.productId || ""] || 0,
      })),
      recentEvents: recentEvents.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
      hasData: imp7 > 0 || imp30 > 0 || atc7 > 0 || atc30 > 0,
    },
  };
};

// ── Action ─────────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const boolField = (key: string) => formData.get(key) === "true";
  const intField = (key: string, fallback: number) =>
    parseInt(String(formData.get(key) || fallback), 10);
  const strField = (key: string, fallback: string) =>
    String(formData.get(key) || fallback);

  const updateData = {
    enabled: boolField("enabled"),
    alternativeNudge: boolField("alternativeNudge"),
    comparisonBar: boolField("comparisonBar"),
    tagNavigator: boolField("tagNavigator"),
    trustNudge: boolField("trustNudge"),
    thresholdBrowsing: intField("thresholdBrowsing", 30),
    thresholdConsidering: intField("thresholdConsidering", 55),
    thresholdHighIntent: intField("thresholdHighIntent", 75),
    thresholdStrongIntent: intField("thresholdStrongIntent", 89),
    thresholdReadyToBuy: intField("thresholdReadyToBuy", 90),
    styleAccentColor: strField("styleAccentColor", "#000000"),
    styleTextColor: strField("styleTextColor", "#1a1a1a"),
    styleBgColor: strField("styleBgColor", "#ffffff"),
    styleBorderRadius: intField("styleBorderRadius", 8),
    styleFontSize: intField("styleFontSize", 14),
    styleButtonStyle: strField("styleButtonStyle", "filled"),
    stylePosition: strField("stylePosition", "default"),
    styleCustomCSS: strField("styleCustomCSS", ""),
    widgetTitle: strField("widgetTitle", "Không chắc chắn? Khách hàng tương tự cũng xem những sản phẩm này."),
  };

  await db.smartRecSettings.upsert({
    where: { shop },
    create: { shop, ...updateData },
    update: updateData,
  });

  return { success: true };
};

// ── Types ─────────────────────────────────────────────────────

type WidgetKey = "alternativeNudge" | "comparisonBar" | "tagNavigator" | "trustNudge";
type Tab = "settings" | "analytics" | "appearance";

const WIDGET_INFO: { key: WidgetKey; title: string; desc: string; icon: string; color: string }[] = [
  { key: "alternativeNudge", title: "Alternative Nudge", desc: "Gợi ý sản phẩm thay thế khi khách đang phân vân trên product page", icon: "💡", color: "#6366f1" },
  { key: "comparisonBar", title: "Comparison Bar", desc: "So sánh 2 sản phẩm khi khách xem qua lại nhiều sản phẩm", icon: "⚖️", color: "#0891b2" },
  { key: "tagNavigator", title: "Tag Navigator", desc: "Gợi ý tag lọc sản phẩm khi khách bị lạc, back nhiều lần", icon: "🏷️", color: "#d97706" },
  { key: "trustNudge", title: "Trust Nudge", desc: "Hiện rating + đổi trả miễn phí khi khách do dự trên cart page", icon: "🛡️", color: "#059669" },
];

// ── Dashboard Component ──────────────────────────────────────

export default function SmartRecDashboard() {
  const { settings, analytics } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [enabled, setEnabled] = useState(settings.enabled);
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>({
    alternativeNudge: settings.alternativeNudge,
    comparisonBar: settings.comparisonBar,
    tagNavigator: settings.tagNavigator,
    trustNudge: settings.trustNudge,
  });
  const [sensitivity, setSensitivity] = useState(settings.thresholdHighIntent);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"7" | "30">("7");

  const [widgetStyles, setWidgetStyles] = useState({
    styleAccentColor: settings.styleAccentColor,
    styleTextColor: settings.styleTextColor,
    styleBgColor: settings.styleBgColor,
    styleBorderRadius: settings.styleBorderRadius,
    styleFontSize: settings.styleFontSize,
    styleButtonStyle: settings.styleButtonStyle,
    styleCustomCSS: settings.styleCustomCSS,
  });
  const [widgetTitle, setWidgetTitle] = useState(settings.widgetTitle);

  const isSaving = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.data, shopify]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.set("enabled", String(enabled));
    Object.entries(widgets).forEach(([k, v]) => formData.set(k, String(v)));
    formData.set("thresholdBrowsing", "30");
    formData.set("thresholdConsidering", "55");
    formData.set("thresholdHighIntent", String(sensitivity));
    formData.set("thresholdStrongIntent", "89");
    formData.set("thresholdReadyToBuy", "90");
    Object.entries(widgetStyles).forEach(([k, v]) => formData.set(k, String(v)));
    formData.set("stylePosition", "default");
    formData.set("widgetTitle", widgetTitle);
    fetcher.submit(formData, { method: "POST" });
  }, [enabled, widgets, sensitivity, widgetStyles, widgetTitle, fetcher]);

  const imp = analyticsPeriod === "7" ? analytics.impressions7 : analytics.impressions30;
  const clicks = analyticsPeriod === "7" ? analytics.clicks7 : analytics.clicks30;
  const revenue = analyticsPeriod === "7" ? analytics.revenue7 : analytics.revenue30;
  const topProducts = analyticsPeriod === "7" ? analytics.topProducts7 : analytics.topProducts30;
  const ctr = imp > 0 ? ((clicks / imp) * 100).toFixed(1) : "0.0";

  function formatRevenue(val: number): string {
    if (val === 0) return "0₫";
    return val.toLocaleString("vi-VN") + "₫";
  }

  return (
    <s-page heading="SmartRec Dashboard">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        Save settings
      </s-button>

      {/* Status Banner */}
      <s-section>
        <div style={{
          padding: "16px 20px", borderRadius: 12,
          background: enabled ? "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)" : "#f9fafb",
          border: `1px solid ${enabled ? "#bbf7d0" : "#e5e7eb"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: enabled ? "#166534" : "#6b7280" }}>
              {enabled ? "SmartRec đang hoạt động" : "SmartRec tạm dừng"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {Object.values(widgets).filter(Boolean).length}/4 widgets bật
            </div>
          </div>
          <s-checkbox checked={enabled || undefined} onChange={() => setEnabled(!enabled)}>
            Enable
          </s-checkbox>
        </div>
      </s-section>

      {/* Tab Navigation */}
      <s-section>
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e5e7eb", marginBottom: 4 }}>
          {([
            { id: "settings" as Tab, label: "Cài đặt" },
            { id: "analytics" as Tab, label: "Analytics" },
            { id: "appearance" as Tab, label: "Appearance" },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px", fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? "#1a1a1a" : "#6b7280",
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: activeTab === tab.id ? "2px solid #1a1a1a" : "2px solid transparent",
                marginBottom: -2, transition: "all 150ms",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </s-section>

      {/* ═══════════════════════════════════════════════════════════
           TAB 1 — CÀI ĐẶT
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <>
          {/* Widget Toggle Cards */}
          <s-section heading="Widgets">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              {WIDGET_INFO.map((w) => {
                const isOn = widgets[w.key];
                return (
                  <div key={w.key} style={{
                    border: `1px solid ${isOn ? w.color + "40" : "#e5e7eb"}`,
                    borderRadius: 12, padding: "16px 20px",
                    background: isOn ? w.color + "08" : "#fff",
                    transition: "all 200ms",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{w.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{w.title}</span>
                      </div>
                      <s-checkbox
                        checked={isOn || undefined}
                        onChange={() => setWidgets((prev) => ({ ...prev, [w.key]: !prev[w.key] }))}
                        disabled={!enabled || undefined}
                      />
                    </div>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>{w.desc}</p>
                  </div>
                );
              })}
            </div>
          </s-section>

          {/* Sensitivity Slider */}
          <s-section heading="Ngưỡng kích hoạt">
            <s-text variant="subdued">
              Điều chỉnh độ nhạy của SmartRec. "Nhạy" hiện widget sớm hơn, "Thận trọng" chỉ hiện khi tín hiệu rất rõ ràng.
            </s-text>
            <div style={{
              marginTop: 16, padding: 20, background: "#f9fafb", borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                <span style={{ color: "#d97706" }}>Nhạy</span>
                <span style={{ color: "#6b7280", fontWeight: 700 }}>
                  Intent Score threshold: {sensitivity}
                </span>
                <span style={{ color: "#059669" }}>Thận trọng</span>
              </div>
              <input
                type="range"
                min="45"
                max="70"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseInt(e.target.value, 10))}
                disabled={!enabled}
                style={{ width: "100%", height: 6, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                <span>45</span>
                <span>55</span>
                <span>65</span>
                <span>70</span>
              </div>
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12, lineHeight: 1.6 }}>
                {sensitivity <= 50
                  ? "Widget sẽ hiện khá sớm trong hành trình mua hàng. Phù hợp store có traffic thấp, muốn tối đa cơ hội convert."
                  : sensitivity <= 60
                    ? "Mức cân bằng. Widget hiện khi có đủ tín hiệu quan tâm nhưng chưa quá trễ."
                    : "Widget chỉ hiện khi shopper thật sự đang cân nhắc. Ít xâm phạm trải nghiệm mua hàng."}
              </p>
            </div>
          </s-section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
           TAB 2 — ANALYTICS
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === "analytics" && (
        <>
          {!analytics.hasData ? (
            <s-section>
              <div style={{
                textAlign: "center", padding: "60px 20px",
                background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb",
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <div style={{
                  width: 40, height: 40, margin: "0 auto 20px",
                  border: "3px solid #e5e7eb", borderTopColor: "#6366f1",
                  borderRadius: "50%", animation: "sr-spin 1s linear infinite",
                }} />
                <style>{`@keyframes sr-spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px", color: "#1a1a1a" }}>
                  SmartRec đang thu thập data
                </p>
                <p style={{ fontSize: 14, color: "#6b7280", margin: 0, maxWidth: 400, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
                  Data cập nhật realtime. Khi khách hàng xem hoặc click "Thêm vào giỏ" từ widget, số liệu sẽ hiện ngay tại đây.
                </p>
              </div>
            </s-section>
          ) : (
            <>
              {/* Period Toggle */}
              <s-section>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                  <div style={{
                    display: "inline-flex", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden",
                  }}>
                    {(["7", "30"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAnalyticsPeriod(p)}
                        style={{
                          padding: "6px 16px", fontSize: 13, fontWeight: analyticsPeriod === p ? 600 : 400,
                          background: analyticsPeriod === p ? "#1a1a1a" : "#fff",
                          color: analyticsPeriod === p ? "#fff" : "#6b7280",
                          border: "none", cursor: "pointer", transition: "all 150ms",
                        }}
                      >
                        {p} ngày
                      </button>
                    ))}
                  </div>
                </div>
              </s-section>

              {/* Big Numbers */}
              <s-section>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div style={{
                    background: "#f0f9ff", borderRadius: 12, padding: "24px 20px", textAlign: "center",
                    border: "1px solid #bae6fd",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0369a1", marginBottom: 4 }}>Lượt hiển thị</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: "#0c4a6e" }}>{imp.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#0369a1", marginTop: 2 }}>impressions</div>
                  </div>
                  <div style={{
                    background: "#fdf4ff", borderRadius: 12, padding: "24px 20px", textAlign: "center",
                    border: "1px solid #f0abfc",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#86198f", marginBottom: 4 }}>Add to Cart từ widget</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: "#701a75" }}>{clicks.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#86198f", marginTop: 2 }}>CTR: {ctr}%</div>
                  </div>
                  <div style={{
                    background: "#ecfdf5", borderRadius: 12, padding: "24px 20px", textAlign: "center",
                    border: "1px solid #86efac",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#166534", marginBottom: 4 }}>Revenue Attributed</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: "#14532d" }}>{formatRevenue(revenue)}</div>
                    <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>từ Add to Cart qua widget</div>
                  </div>
                </div>
              </s-section>

              {/* Top Products Table */}
              <s-section heading="Top 5 sản phẩm được recommend">
                {topProducts.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 120px 120px 100px",
                      gap: 0, fontSize: 12, fontWeight: 600, color: "#6b7280",
                      padding: "10px 16px", background: "#f9fafb", borderRadius: "8px 8px 0 0",
                      borderBottom: "1px solid #e5e7eb",
                    }}>
                      <span>Sản phẩm</span>
                      <span style={{ textAlign: "right" }}>Recommend</span>
                      <span style={{ textAlign: "right" }}>Click</span>
                      <span style={{ textAlign: "right" }}>CTR</span>
                    </div>
                    {topProducts.map((p, i) => {
                      const productCtr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(1) : "0.0";
                      return (
                        <div key={i} style={{
                          display: "grid", gridTemplateColumns: "1fr 120px 120px 100px",
                          gap: 0, fontSize: 13, padding: "12px 16px",
                          borderBottom: "1px solid #f3f4f6",
                          background: i % 2 === 0 ? "#fff" : "#fafafa",
                        }}>
                          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Product #{p.productId}
                          </span>
                          <span style={{ textAlign: "right", color: "#0369a1", fontWeight: 600 }}>{p.impressions}</span>
                          <span style={{ textAlign: "right", color: "#86198f", fontWeight: 600 }}>{p.clicks}</span>
                          <span style={{ textAlign: "right", fontWeight: 600, color: parseFloat(productCtr) > 5 ? "#059669" : "#6b7280" }}>
                            {productCtr}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                    Chưa có dữ liệu sản phẩm trong {analyticsPeriod} ngày qua
                  </div>
                )}
              </s-section>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
           TAB 3 — APPEARANCE
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === "appearance" && (
        <s-section>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* Left: Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Màu sắc */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Màu sắc</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {([
                    { key: "styleAccentColor" as const, label: "Màu nút (View / Add to Cart)" },
                    { key: "styleTextColor" as const, label: "Màu chữ tiêu đề sản phẩm" },
                    { key: "styleBgColor" as const, label: "Màu nền card" },
                  ]).map((c) => (
                    <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input
                        type="color"
                        value={widgetStyles[c.key]}
                        onChange={(e) => setWidgetStyles((p) => ({ ...p, [c.key]: e.target.value }))}
                        disabled={!enabled}
                        style={{ width: 40, height: 40, border: "1px solid #d1d5db", borderRadius: 8, padding: 2, cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>{widgetStyles[c.key]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bo góc */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Bo góc</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="range" min="0" max="20"
                    value={widgetStyles.styleBorderRadius}
                    onChange={(e) => setWidgetStyles((p) => ({ ...p, styleBorderRadius: parseInt(e.target.value, 10) }))}
                    disabled={!enabled}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 44, textAlign: "center",
                    padding: "4px 8px", background: "#f3f4f6", borderRadius: 6 }}>
                    {widgetStyles.styleBorderRadius}px
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                  <span>0px (vuông)</span>
                  <span>20px (tròn)</span>
                </div>
              </div>

              {/* Kiểu nút */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Kiểu nút</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    { id: "filled", label: "Filled", desc: "Nút đặc" },
                    { id: "outline", label: "Outlined", desc: "Nút viền" },
                    { id: "text", label: "Text only", desc: "Chữ + underline" },
                  ] as const).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setWidgetStyles((p) => ({ ...p, styleButtonStyle: s.id }))}
                      disabled={!enabled}
                      style={{
                        flex: 1, padding: "12px 8px", borderRadius: 8, cursor: "pointer",
                        textAlign: "center", transition: "all 150ms",
                        border: widgetStyles.styleButtonStyle === s.id ? `2px solid ${widgetStyles.styleAccentColor}` : "1px solid #e5e7eb",
                        background: widgetStyles.styleButtonStyle === s.id ? widgetStyles.styleAccentColor + "08" : "#fff",
                      }}
                    >
                      <div style={{
                        display: "inline-block", padding: "4px 16px", fontSize: 12, fontWeight: 600,
                        borderRadius: widgetStyles.styleBorderRadius / 2, marginBottom: 6,
                        ...(s.id === "filled" ? {
                          background: widgetStyles.styleAccentColor, color: "#fff", border: "none",
                        } : s.id === "outline" ? {
                          background: "transparent", color: widgetStyles.styleAccentColor,
                          border: `1px solid ${widgetStyles.styleAccentColor}`,
                        } : {
                          background: "transparent", color: widgetStyles.styleAccentColor,
                          border: "none", textDecoration: "underline",
                        }),
                      }}>
                        Button
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tiêu đề widget */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Tiêu đề widget</div>
                <input
                  type="text"
                  value={widgetTitle}
                  onChange={(e) => { if (e.target.value.length <= 50) setWidgetTitle(e.target.value); }}
                  disabled={!enabled}
                  style={{
                    width: "100%", padding: "10px 14px", fontSize: 14,
                    borderRadius: 8, border: "1px solid #d1d5db",
                    background: enabled ? "#fff" : "#f9fafb",
                  }}
                />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, textAlign: "right" }}>
                  {widgetTitle.length}/50
                </div>
              </div>

              {/* Custom CSS */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Custom CSS (nâng cao)</div>
                <textarea
                  value={widgetStyles.styleCustomCSS}
                  onChange={(e) => setWidgetStyles((p) => ({ ...p, styleCustomCSS: e.target.value }))}
                  disabled={!enabled}
                  placeholder={`.sr-widget { /* CSS tùy chỉnh */ }`}
                  style={{
                    width: "100%", minHeight: 80, fontSize: 12, fontFamily: "monospace",
                    padding: 12, borderRadius: 8, border: "1px solid #d1d5db",
                    resize: "vertical", background: enabled ? "#fff" : "#f9fafb",
                  }}
                />
              </div>
            </div>

            {/* Right: Live Preview */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Live Preview</div>
              <div style={{
                background: "#f3f4f6", borderRadius: 12, padding: 24,
                border: "1px solid #e5e7eb", position: "sticky", top: 20,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                  Product Page Preview
                </div>
                {/* Recommendation Card */}
                <div style={{
                  background: widgetStyles.styleBgColor,
                  color: widgetStyles.styleTextColor,
                  borderRadius: widgetStyles.styleBorderRadius,
                  fontSize: widgetStyles.styleFontSize,
                  padding: 16, border: "1px solid rgba(0,0,0,0.08)",
                  position: "relative",
                }}>
                  <p style={{ fontSize: widgetStyles.styleFontSize - 1, fontWeight: 600, margin: "0 0 12px", paddingRight: 28 }}>
                    {widgetTitle || "Product Recommendations"}
                  </p>
                  <div style={{ position: "absolute", top: 12, right: 14, fontSize: 14, color: "#9ca3af", cursor: "default" }}>✕</div>

                  {[
                    { name: "Classic Cotton Tee — White", price: "350.000₫", emoji: "👕" },
                    { name: "Organic Slim Fit Polo", price: "420.000₫", emoji: "👔" },
                  ].map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                      borderTop: i > 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
                    }}>
                      <div style={{
                        width: 56, height: 56, flexShrink: 0,
                        borderRadius: Math.min(widgetStyles.styleBorderRadius, 8),
                        background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22,
                      }}>{p.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: widgetStyles.styleFontSize - 1, marginBottom: 2 }}>{p.name}</div>
                        <div style={{ fontWeight: 700, fontSize: widgetStyles.styleFontSize, marginBottom: 8 }}>{p.price}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" style={{
                            padding: "6px 14px", fontSize: widgetStyles.styleFontSize - 2, fontWeight: 600,
                            borderRadius: Math.min(widgetStyles.styleBorderRadius, 6), cursor: "default",
                            ...(widgetStyles.styleButtonStyle === "filled" ? {
                              background: widgetStyles.styleAccentColor, color: "#fff", border: `1px solid ${widgetStyles.styleAccentColor}`,
                            } : widgetStyles.styleButtonStyle === "outline" ? {
                              background: "transparent", color: widgetStyles.styleAccentColor, border: `1px solid ${widgetStyles.styleAccentColor}`,
                            } : {
                              background: "transparent", color: widgetStyles.styleAccentColor,
                              border: "none", textDecoration: "underline", padding: "6px 4px",
                            }),
                          }}>Thêm vào giỏ</button>
                          <button type="button" style={{
                            padding: "6px 14px", fontSize: widgetStyles.styleFontSize - 2, fontWeight: 500,
                            borderRadius: Math.min(widgetStyles.styleBorderRadius, 6), cursor: "default",
                            background: "transparent", color: widgetStyles.styleTextColor,
                            border: "1px solid rgba(0,0,0,0.12)",
                          }}>Xem chi tiết</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trust Nudge mini preview */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                    Cart Page Preview
                  </div>
                  <div style={{
                    background: widgetStyles.styleBgColor, color: widgetStyles.styleTextColor,
                    borderRadius: widgetStyles.styleBorderRadius,
                    fontSize: widgetStyles.styleFontSize - 1, padding: 12,
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ fontWeight: 600, fontSize: widgetStyles.styleFontSize - 2, marginBottom: 4 }}>Classic Cotton Tee</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: widgetStyles.styleFontSize - 2 }}>
                      <span style={{ color: "#f59e0b" }}>★★★★★</span>
                      <span style={{ opacity: 0.6 }}>234 đánh giá</span>
                      <span style={{ opacity: 0.3 }}>·</span>
                      <span style={{
                        padding: "1px 8px", fontSize: widgetStyles.styleFontSize - 3,
                        background: "rgba(16,185,129,0.1)", color: "#059669", borderRadius: 99,
                      }}>↩ Đổi trả miễn phí</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </s-section>
      )}

      {/* Setup Guide (sidebar) */}
      <s-section slot="aside" heading="Hướng dẫn">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text fontWeight="bold">1. Bật SmartRec</s-text>
            <s-text>Toggle ở banner phía trên</s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text fontWeight="bold">2. Cài Theme Extension</s-text>
            <s-text>Online Store → Themes → Customize → App embeds → bật "SmartRec Tracker"</s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text fontWeight="bold">3. Save & Test</s-text>
            <s-text>Save theme, mở storefront, xem Console (F12) để check logs</s-text>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
