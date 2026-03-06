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
    viewDetail7, viewDetail30,
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
    db.smartRecEvent.count({
      where: { shop, eventType: "view_detail", createdAt: { gte: d7 } },
    }),
    db.smartRecEvent.count({
      where: { shop, eventType: "view_detail", createdAt: { gte: d30 } },
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
      viewDetail7: viewDetail7,
      viewDetail30: viewDetail30,
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
  const intent = formData.get("_intent");

  if (intent === "test_track") {
    await db.smartRecEvent.create({
      data: {
        shop,
        eventType: "widget_atc",
        widgetType: "alternative_nudge",
        productId: "test-" + Date.now(),
        value: 299000,
      },
    });
    return { success: true, tested: true };
  }

  if (intent === "clear_events") {
    await db.smartRecEvent.deleteMany({ where: { shop } });
    return { success: true, cleared: true };
  }

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
    widgetTitle: strField("widgetTitle", "Not sure? Similar customers also viewed these products."),
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
  { key: "alternativeNudge", title: "Alternative Nudge", desc: "Suggest alternative products when shoppers hesitate on product page", icon: "💡", color: "#6366f1" },
  { key: "comparisonBar", title: "Comparison Bar", desc: "Compare 2 products when shoppers browse back and forth", icon: "⚖️", color: "#0891b2" },
  { key: "tagNavigator", title: "Tag Navigator", desc: "Suggest filter tags when shoppers seem lost, navigate back often", icon: "🏷️", color: "#d97706" },
  { key: "trustNudge", title: "Trust Nudge", desc: "Show ratings + free returns badge when shoppers hesitate on cart page", icon: "🛡️", color: "#059669" },
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
  const viewDetail = analyticsPeriod === "7" ? analytics.viewDetail7 : analytics.viewDetail30;
  const topProducts = analyticsPeriod === "7" ? analytics.topProducts7 : analytics.topProducts30;
  const ctr = imp > 0 ? ((clicks / imp) * 100).toFixed(1) : "0.0";


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
              {enabled ? "SmartRec is active" : "SmartRec is paused"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {Object.values(widgets).filter(Boolean).length}/4 widgets enabled
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
            { id: "settings" as Tab, label: "Settings" },
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
           TAB 1 — SETTINGS
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
          <s-section heading="Activation Threshold">
            <s-text variant="subdued">
              Adjust SmartRec sensitivity. "Sensitive" shows widgets earlier, "Cautious" only shows when signals are very clear.
            </s-text>
            <div style={{
              marginTop: 16, padding: 20, background: "#f9fafb", borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                <span style={{ color: "#d97706" }}>Sensitive</span>
                <span style={{ color: "#6b7280", fontWeight: 700 }}>
                  Intent Score threshold: {sensitivity}
                </span>
                <span style={{ color: "#059669" }}>Cautious</span>
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
                  ? "Widgets appear early in the shopping journey. Best for low-traffic stores to maximize conversion opportunities."
                  : sensitivity <= 60
                    ? "Balanced. Widgets appear when there are enough interest signals but not too late."
                    : "Widgets only appear when the shopper is truly considering. Least intrusive to the shopping experience."}
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
          {/* Test + Period Toggle */}
          <s-section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div />
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
                    {p} days
                  </button>
                ))}
              </div>
            </div>
          </s-section>

          {/* ATC Click Count — Main Metric */}
          <s-section>
            <div style={{
              background: "#fdf4ff", borderRadius: 12, padding: "32px 20px", textAlign: "center",
              border: "1px solid #f0abfc",
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#86198f", marginBottom: 8 }}>
                Widget Add to Cart clicks
              </div>
              <div style={{ fontSize: 56, fontWeight: 700, color: "#701a75" }}>
                {clicks.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: "#86198f", marginTop: 8 }}>
                in the last {analyticsPeriod} days
              </div>
            </div>
          </s-section>

          {/* Secondary: View Popup + View Detail */}
          <s-section>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{
                background: "#f0f9ff", borderRadius: 12, padding: "20px", textAlign: "center",
                border: "1px solid #bae6fd",
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0369a1", marginBottom: 4 }}>Popup views</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0c4a6e" }}>{imp.toLocaleString()}</div>
              </div>
              <div style={{
                background: "#ecfdf5", borderRadius: 12, padding: "20px", textAlign: "center",
                border: "1px solid #86efac",
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#166534", marginBottom: 4 }}>"View details" clicks</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#14532d" }}>{viewDetail.toLocaleString()}</div>
              </div>
            </div>
          </s-section>

          {/* Recent Events (debug) */}
          {analytics.recentEvents && analytics.recentEvents.length > 0 && (
            <s-section heading="Recent events">
              <div style={{ marginTop: 8 }}>
                {analytics.recentEvents.map((e: { eventType: string; widgetType?: string | null; productId?: string | null; value?: number; createdAt: string }, i: number) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 16px", fontSize: 13,
                    borderBottom: "1px solid #f3f4f6",
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                  }}>
                    <span style={{ fontWeight: 600, color: e.eventType === "widget_atc" ? "#86198f" : "#0369a1" }}>
                      {e.eventType}
                    </span>
                    <span style={{ color: "#6b7280" }}>{e.productId || "—"}</span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                      {new Date(e.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            </s-section>
          )}

          {clicks === 0 && imp === 0 && (
            <s-section>
              <div style={{
                textAlign: "center", padding: "40px 20px", color: "#6b7280", fontSize: 14,
              }}>
                <p style={{ margin: "0 0 12px" }}>No data yet. Try clicking "Add to cart" from the widget on the storefront.</p>
              </div>
            </s-section>
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

              {/* Colors */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Colors</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {([
                    { key: "styleAccentColor" as const, label: "Button color (View / Add to Cart)" },
                    { key: "styleTextColor" as const, label: "Product title text color" },
                    { key: "styleBgColor" as const, label: "Card background color" },
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

              {/* Border radius */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Border Radius</div>
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
                  <span>0px (square)</span>
                  <span>20px (round)</span>
                </div>
              </div>

              {/* Button style */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Button Style</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    { id: "filled", label: "Filled", desc: "Solid button" },
                    { id: "outline", label: "Outlined", desc: "Border only" },
                    { id: "text", label: "Text only", desc: "Text + underline" },
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

              {/* Widget title */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Widget Title</div>
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
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Custom CSS (advanced)</div>
                <textarea
                  value={widgetStyles.styleCustomCSS}
                  onChange={(e) => setWidgetStyles((p) => ({ ...p, styleCustomCSS: e.target.value }))}
                  disabled={!enabled}
                  placeholder={`.sr-widget { /* custom CSS */ }`}
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
                          }}>Add to cart</button>
                          <button type="button" style={{
                            padding: "6px 14px", fontSize: widgetStyles.styleFontSize - 2, fontWeight: 500,
                            borderRadius: Math.min(widgetStyles.styleBorderRadius, 6), cursor: "default",
                            background: "transparent", color: widgetStyles.styleTextColor,
                            border: "1px solid rgba(0,0,0,0.12)",
                          }}>View details</button>
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
                      <span style={{ opacity: 0.6 }}>234 reviews</span>
                      <span style={{ opacity: 0.3 }}>·</span>
                      <span style={{
                        padding: "1px 8px", fontSize: widgetStyles.styleFontSize - 3,
                        background: "rgba(16,185,129,0.1)", color: "#059669", borderRadius: 99,
                      }}>↩ Free returns</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </s-section>
      )}

      {/* Setup Guide (sidebar) */}
            <s-section slot="aside" heading="Guide">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
<s-text fontWeight="bold">1. Enable SmartRec</s-text>
              <s-text>Toggle the banner above</s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
<s-text fontWeight="bold">2. Install Theme Extension</s-text>
              <s-text>Online Store → Themes → Customize → App embeds → enable "SmartRec Tracker"</s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text fontWeight="bold">3. Save & Test</s-text>
            <s-text>Save theme, open storefront, check Console (F12) for logs</s-text>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
