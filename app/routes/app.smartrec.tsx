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

  const totalEvents = await db.smartRecEvent.count({ where: { shop } });

  const widgetBreakdown = await db.smartRecEvent.groupBy({
    by: ["widgetType"],
    where: { shop, widgetType: { not: null } },
    _count: true,
  });

  const recentEvents = await db.smartRecEvent.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { eventType: true, widgetType: true, createdAt: true },
  });

  return {
    settings,
    stats: {
      totalEvents,
      byWidget: widgetBreakdown.map((w) => ({
        type: w.widgetType || "unknown",
        count: w._count,
      })),
      recentEvents: recentEvents.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
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

  await db.smartRecSettings.upsert({
    where: { shop },
    create: {
      shop,
      enabled: boolField("enabled"),
      alternativeNudge: boolField("alternativeNudge"),
      comparisonBar: boolField("comparisonBar"),
      tagNavigator: boolField("tagNavigator"),
      thresholdBrowsing: intField("thresholdBrowsing", 30),
      thresholdConsidering: intField("thresholdConsidering", 55),
      thresholdHighIntent: intField("thresholdHighIntent", 75),
      thresholdStrongIntent: intField("thresholdStrongIntent", 89),
      thresholdReadyToBuy: intField("thresholdReadyToBuy", 90),
    },
    update: {
      enabled: boolField("enabled"),
      alternativeNudge: boolField("alternativeNudge"),
      comparisonBar: boolField("comparisonBar"),
      tagNavigator: boolField("tagNavigator"),
      thresholdBrowsing: intField("thresholdBrowsing", 30),
      thresholdConsidering: intField("thresholdConsidering", 55),
      thresholdHighIntent: intField("thresholdHighIntent", 75),
      thresholdStrongIntent: intField("thresholdStrongIntent", 89),
      thresholdReadyToBuy: intField("thresholdReadyToBuy", 90),
    },
  });

  return { success: true };
};

// ── Styles ─────────────────────────────────────────────────────

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    margin: "16px 0",
  } as React.CSSProperties,
  statCard: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: "20px 24px",
    textAlign: "center" as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    margin: "4px 0",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: 500,
  },
  widgetCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
  },
  widgetHeader: {
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #f3f4f6",
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  widgetDesc: {
    fontSize: 13,
    color: "#6b7280",
    margin: "4px 0 0",
  },
  badge: (color: string) => ({
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 99,
    background: color + "15",
    color,
  }),
  previewContainer: {
    padding: 20,
    background: "#f9fafb",
    minHeight: 140,
    position: "relative" as const,
  },
  previewLabel: {
    position: "absolute" as const,
    top: 8,
    right: 12,
    fontSize: 10,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  // Alternative Nudge preview
  altNudge: {
    background: "#fff",
    borderRadius: 8,
    padding: 14,
    border: "1px solid rgba(0,0,0,0.08)",
    maxWidth: 380,
  },
  altNudgeTitle: {
    fontSize: 12,
    fontWeight: 600,
    margin: "0 0 10px",
    color: "#374151",
  },
  altItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
  },
  altImg: {
    width: 56,
    height: 56,
    borderRadius: 6,
    background: "#e5e7eb",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  altInfo: {
    flex: 1,
    minWidth: 0,
  },
  altName: {
    fontSize: 13,
    fontWeight: 500,
    margin: 0,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  altPrice: {
    fontSize: 13,
    fontWeight: 600,
    margin: "2px 0 6px",
  },
  altBtn: {
    fontSize: 11,
    fontWeight: 500,
    padding: "4px 12px",
    border: "1px solid #374151",
    borderRadius: 4,
    background: "transparent",
    color: "#374151",
    cursor: "default",
  },
  // Comparison Bar preview
  compareBar: {
    background: "#fff",
    borderRadius: 8,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 -1px 4px rgba(0,0,0,0.04)",
  },
  compareThumb: {
    width: 36,
    height: 36,
    borderRadius: 4,
    background: "#e5e7eb",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
  },
  compareName: {
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 100,
  },
  compareDiff: {
    fontSize: 11,
    color: "#6b7280",
    whiteSpace: "nowrap" as const,
  },
  compareCta: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 14px",
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "default",
    flexShrink: 0,
  },
  // Tag Navigator preview
  tagPanel: {
    background: "#fff",
    borderRadius: 8,
    padding: 16,
    border: "1px solid rgba(0,0,0,0.08)",
    width: 220,
    boxShadow: "-2px 0 8px rgba(0,0,0,0.04)",
  },
  tagTitle: {
    fontSize: 13,
    fontWeight: 600,
    margin: "0 0 2px",
  },
  tagSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    margin: "0 0 12px",
  },
  tagBtn: {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 500,
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 4,
    background: "transparent",
    textAlign: "left" as const,
    cursor: "default",
    marginBottom: 6,
    color: "#374151",
  },
  // Intent flow
  flowContainer: {
    display: "flex",
    gap: 4,
    margin: "12px 0",
    flexWrap: "wrap" as const,
  },
  flowStep: (active: boolean, color: string) => ({
    flex: 1,
    minWidth: 120,
    padding: "12px 14px",
    borderRadius: 8,
    background: active ? color + "10" : "#f9fafb",
    border: `1px solid ${active ? color + "40" : "#e5e7eb"}`,
    textAlign: "center" as const,
  }),
  flowScore: {
    fontSize: 18,
    fontWeight: 700,
    margin: "0 0 2px",
  },
  flowLabel: {
    fontSize: 11,
    fontWeight: 600,
    margin: 0,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  flowAction: {
    fontSize: 11,
    color: "#6b7280",
    margin: "4px 0 0",
  },
  // Settings
  settingRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
  },
  settingDesc: {
    fontSize: 12,
    color: "#6b7280",
  },
  thresholdInput: {
    width: 64,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    textAlign: "center" as const,
  },
  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: "24px 0 8px",
    paddingBottom: 8,
    borderBottom: "2px solid #f3f4f6",
  },
};

// ── Widget Preview Components ──────────────────────────────────

function AlternativeNudgePreview() {
  return (
    <div style={styles.previewContainer}>
      <span style={styles.previewLabel}>Preview — Product Page</span>
      <div style={styles.altNudge}>
        <p style={styles.altNudgeTitle}>
          Không chắc chắn? Khách hàng tương tự cũng xem những sản phẩm này.
        </p>
        {[
          { name: "Classic Cotton Tee — White", price: "350.000₫", emoji: "👕" },
          { name: "Organic Slim Fit Polo", price: "420.000₫", emoji: "👔" },
        ].map((p, i) => (
          <div key={i} style={{ ...styles.altItem, borderTop: i > 0 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
            <div style={styles.altImg}>{p.emoji}</div>
            <div style={styles.altInfo}>
              <p style={styles.altName}>{p.name}</p>
              <p style={styles.altPrice}>{p.price}</p>
              <span style={styles.altBtn}>Xem ›</span>
            </div>
          </div>
        ))}
        <div style={{ position: "absolute", top: 28, right: 32, fontSize: 14, color: "#9ca3af", cursor: "default" }}>✕</div>
      </div>
    </div>
  );
}

function ComparisonBarPreview() {
  return (
    <div style={styles.previewContainer}>
      <span style={styles.previewLabel}>Preview — Sticky Bottom Bar</span>
      <div style={styles.compareBar}>
        <div style={styles.compareThumb}>👟</div>
        <span style={styles.compareName}>Nike Air Max 90</span>
        <span style={styles.compareDiff}>Rẻ hơn 200.000₫ · Rating +0.3★</span>
        <button style={styles.compareCta} type="button">So sánh</button>
        <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: 8, cursor: "default" }}>✕</span>
      </div>
      <div style={{ marginTop: 12, background: "#fff", borderRadius: 8, padding: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px" }}>So sánh sản phẩm</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "center" }}>
          {[
            { name: "Nike Air Max 90", price: "2.800.000₫", rating: "4.5★ (128)", emoji: "👟" },
            { name: "Adidas Ultraboost", price: "3.000.000₫", rating: "4.8★ (256)", emoji: "👟" },
          ].map((p, i) => (
            <div key={i}>
              <div style={{ width: 80, height: 80, borderRadius: 8, background: "#e5e7eb", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{p.emoji}</div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{p.name}</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{p.price}</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{p.rating}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TagNavigatorPreview() {
  return (
    <div style={{ ...styles.previewContainer, display: "flex", justifyContent: "flex-end" }}>
      <span style={styles.previewLabel}>Preview — Slide-in Panel (Right)</span>
      <div style={styles.tagPanel}>
        <p style={styles.tagTitle}>Vẫn đang tìm kiếm?</p>
        <p style={styles.tagSubtitle}>Thử lọc theo:</p>
        {["Áo cotton", "Unisex", "Summer collection", "Under 500K"].map((tag, i) => (
          <button key={i} style={styles.tagBtn} type="button">{tag}</button>
        ))}
        <div style={{ position: "absolute", top: 28, right: 32, fontSize: 14, color: "#9ca3af", cursor: "default" }}>✕</div>
      </div>
    </div>
  );
}

// ── Widget Config ──────────────────────────────────────────────

const WIDGETS = [
  {
    key: "alternativeNudge" as const,
    title: "Alternative Nudge",
    desc: "Gợi ý 2 sản phẩm thay thế khi shopper hesitate trên product page",
    trigger: "Score 56-89 + size_chart_open hoặc review_hover",
    position: "Inline dưới product description, trên nút Add to Cart",
    color: "#6366f1",
    preview: AlternativeNudgePreview,
  },
  {
    key: "comparisonBar" as const,
    title: "Comparison Bar",
    desc: "So sánh 2 sản phẩm khi shopper xem qua lại giữa chúng",
    trigger: "compare_pattern (xem ≥2 products cùng type)",
    position: "Sticky bottom 60px + slide-up comparison panel",
    color: "#0891b2",
    preview: ComparisonBarPreview,
  },
  {
    key: "tagNavigator" as const,
    title: "Tag Navigator",
    desc: "Hiện tag shortcuts khi shopper bị lost (xem rồi back nhiều lần)",
    trigger: "back_nav ≥ 3 + cart empty + session > 3 min",
    position: "Slide-in panel từ right edge, 260px wide",
    color: "#d97706",
    preview: TagNavigatorPreview,
  },
];

const INTENT_FLOW = [
  { score: "0-30", label: "Browsing", action: "Không hiện gì", color: "#9ca3af" },
  { score: "31-55", label: "Considering", action: "Quiet suggestion", color: "#6366f1" },
  { score: "56-75", label: "High Intent", action: "Alternative Nudge", color: "#0891b2" },
  { score: "76-89", label: "Strong Intent", action: "Social proof + alt", color: "#d97706" },
  { score: "90-100", label: "Ready to Buy", action: "KHÔNG hiện widget!", color: "#059669" },
];

const THRESHOLDS = [
  { key: "thresholdBrowsing" as const, label: "Browsing", desc: "Mới vào — chưa engage" },
  { key: "thresholdConsidering" as const, label: "Considering", desc: "Bắt đầu quan tâm" },
  { key: "thresholdHighIntent" as const, label: "High Intent", desc: "Đang cân nhắc nghiêm túc" },
  { key: "thresholdStrongIntent" as const, label: "Strong Intent", desc: "Gần mua nhưng cần tiebreaker" },
  { key: "thresholdReadyToBuy" as const, label: "Ready to Buy", desc: "Sẵn sàng mua — dừng hiện widget" },
];

// ── Component ──────────────────────────────────────────────────

type WidgetKey = "alternativeNudge" | "comparisonBar" | "tagNavigator";
type ThresholdKey = "thresholdBrowsing" | "thresholdConsidering" | "thresholdHighIntent" | "thresholdStrongIntent" | "thresholdReadyToBuy";

export default function SmartRecDashboard() {
  const { settings, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [enabled, setEnabled] = useState(settings.enabled);
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>({
    alternativeNudge: settings.alternativeNudge,
    comparisonBar: settings.comparisonBar,
    tagNavigator: settings.tagNavigator,
  });
  const [thresholds, setThresholds] = useState<Record<ThresholdKey, string>>({
    thresholdBrowsing: String(settings.thresholdBrowsing),
    thresholdConsidering: String(settings.thresholdConsidering),
    thresholdHighIntent: String(settings.thresholdHighIntent),
    thresholdStrongIntent: String(settings.thresholdStrongIntent),
    thresholdReadyToBuy: String(settings.thresholdReadyToBuy),
  });
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);

  const isSaving =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.data, shopify]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.set("enabled", String(enabled));
    Object.entries(widgets).forEach(([k, v]) => formData.set(k, String(v)));
    Object.entries(thresholds).forEach(([k, v]) => {
      const num = parseInt(v, 10);
      formData.set(k, String(isNaN(num) ? 0 : Math.max(0, Math.min(100, num))));
    });
    fetcher.submit(formData, { method: "POST" });
  }, [enabled, widgets, thresholds, fetcher]);

  const activeCount = Object.values(widgets).filter(Boolean).length;
  const totalWidgets = WIDGETS.length;

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

      {/* ── Status Banner ──────────────────────────────── */}
      <s-section>
        <div style={{
          padding: "16px 20px",
          borderRadius: 12,
          background: enabled ? "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)" : "#f9fafb",
          border: `1px solid ${enabled ? "#bbf7d0" : "#e5e7eb"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: enabled ? "#166534" : "#6b7280" }}>
              {enabled ? "SmartRec is active" : "SmartRec is paused"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {activeCount}/{totalWidgets} widgets enabled · {stats.totalEvents} events tracked
            </div>
          </div>
          <s-checkbox
            checked={enabled || undefined}
            onChange={() => setEnabled(!enabled)}
          >
            Enable
          </s-checkbox>
        </div>
      </s-section>

      {/* ── Stats Grid ─────────────────────────────────── */}
      <s-section heading="Overview">
        <div style={styles.grid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Events</div>
            <div style={styles.statValue}>{stats.totalEvents}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Active Widgets</div>
            <div style={styles.statValue}>{activeCount}/{totalWidgets}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Widget Types</div>
            <div style={{ ...styles.statValue, fontSize: 24 }}>
              {stats.byWidget.length > 0
                ? stats.byWidget.map((w) => `${w.type}: ${w.count}`).join(", ")
                : "No data yet"}
            </div>
          </div>
        </div>
      </s-section>

      {/* ── Intent Score Flow ──────────────────────────── */}
      <s-section heading="Intent Score Flow">
        <s-text variant="subdued">
          SmartRec theo dõi hành vi khách hàng, tính Intent Score (0-100), và chỉ hiện widget khi tín hiệu đủ mạnh. Score 90+ = KHÔNG hiện widget (họ đã quyết định rồi).
        </s-text>
        <div style={styles.flowContainer}>
          {INTENT_FLOW.map((step, i) => (
            <div key={i} style={styles.flowStep(true, step.color)}>
              <p style={{ ...styles.flowScore, color: step.color }}>{step.score}</p>
              <p style={{ ...styles.flowLabel, color: step.color }}>{step.label}</p>
              <p style={styles.flowAction}>{step.action}</p>
            </div>
          ))}
        </div>
      </s-section>

      {/* ── Widget Components ──────────────────────────── */}
      <div style={styles.sectionTitle}>4 Widget Components</div>
      <s-text variant="subdued">
        Mỗi widget render trên storefront khi Intent Engine phát hiện tín hiệu hành vi phù hợp.
        Click "Preview" để xem widget trông như thế nào trên store.
      </s-text>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {WIDGETS.map((w) => {
          const Preview = w.preview;
          const isExpanded = expandedWidget === w.key;
          const isEnabled = widgets[w.key];

          return (
            <div key={w.key} style={styles.widgetCard}>
              <div style={styles.widgetHeader}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={styles.widgetTitle}>{w.title}</p>
                    <span style={styles.badge(w.color)}>
                      {isEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                  <p style={styles.widgetDesc}>{w.desc}</p>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                    <span><strong>Trigger:</strong> {w.trigger}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    <strong>Position:</strong> {w.position}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setExpandedWidget(isExpanded ? null : w.key)}
                    style={{
                      padding: "6px 14px",
                      fontSize: 13,
                      fontWeight: 500,
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      background: isExpanded ? "#f3f4f6" : "#fff",
                      cursor: "pointer",
                      color: "#374151",
                    }}
                  >
                    {isExpanded ? "Hide" : "Preview"}
                  </button>
                  <s-checkbox
                    checked={isEnabled || undefined}
                    onChange={() => setWidgets((prev) => ({ ...prev, [w.key]: !prev[w.key] }))}
                    disabled={!enabled || undefined}
                  />
                </div>
              </div>

              {isExpanded && <Preview />}
            </div>
          );
        })}
      </div>

      {/* ── Threshold Settings ─────────────────────────── */}
      <s-section heading="Intent Score Thresholds">
        <s-text variant="subdued">
          Điều chỉnh ngưỡng Intent Score (0-100) để quyết định khi nào hiện widget.
        </s-text>
        <div style={{ marginTop: 12 }}>
          {THRESHOLDS.map((t) => (
            <div key={t.key} style={styles.settingRow}>
              <div style={{ flex: 1 }}>
                <div style={styles.settingLabel}>{t.label}</div>
                <div style={styles.settingDesc}>{t.desc}</div>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={thresholds[t.key]}
                onChange={(e) => {
                  setThresholds((prev) => ({ ...prev, [t.key]: e.target.value }));
                }}
                onBlur={(e) => {
                  const num = parseInt(e.target.value, 10);
                  const clamped = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
                  setThresholds((prev) => ({ ...prev, [t.key]: String(clamped) }));
                }}
                disabled={!enabled}
                style={styles.thresholdInput}
              />
            </div>
          ))}
        </div>
      </s-section>

      {/* ── Recent Activity ────────────────────────────── */}
      {stats.recentEvents.length > 0 && (
        <s-section heading="Recent Activity">
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {stats.recentEvents.map((e, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 12, fontSize: 13 }}>
                <span style={{ color: "#6b7280", minWidth: 120 }}>
                  {new Date(e.createdAt).toLocaleString()}
                </span>
                <span style={{ fontWeight: 500 }}>{e.eventType}</span>
                {e.widgetType && (
                  <span style={{ color: "#6b7280" }}>{e.widgetType}</span>
                )}
              </div>
            ))}
          </div>
        </s-section>
      )}

      {/* ── Setup Guide (aside) ────────────────────────── */}
      <s-section slot="aside" heading="Setup Guide">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text fontWeight="bold">Step 1</s-text>
            <s-text>Bật SmartRec ở status banner phía trên</s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text fontWeight="bold">Step 2</s-text>
            <s-text>
              Vào Online Store → Themes → Customize → App embeds →
              bật "SmartRec Tracker"
            </s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text fontWeight="bold">Step 3</s-text>
            <s-text>Save theme và mở storefront</s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text fontWeight="bold">Step 4</s-text>
            <s-text>
              Mở Console (F12) để xem logs. Test widget bằng:
            </s-text>
            <s-box padding="tight" background="subdued" borderRadius="base">
              <code style={{ fontSize: 12 }}>SmartRecRender({"{"} type: "alternative_nudge", ... {"}"})</code>
            </s-box>
          </s-box>
        </s-stack>
      </s-section>

      {/* ── Architecture (aside) ───────────────────────── */}
      <s-section slot="aside" heading="Architecture">
        <s-stack direction="block" gap="tight">
          <s-text fontWeight="bold">Data Flow</s-text>
          <s-box padding="tight" background="subdued" borderRadius="base">
            <pre style={{ fontSize: 11, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
{`Shopper visits store
  → signal-collector.js
  → calculates Intent Score
  → POST /apps/smartrec/intent
  → Intent Engine fetches
    Shopify Admin API data
  → Returns action + real data
  → widget-renderer.js
  → Renders correct widget`}
            </pre>
          </s-box>

          <s-text fontWeight="bold">Key Principles</s-text>
          <s-unordered-list>
            <s-list-item>Intent-first, not upsell-first</s-list-item>
            <s-list-item>Score 90+ = no widget shown</s-list-item>
            <s-list-item>Fade-in 300ms, no popups</s-list-item>
            <s-list-item>Dismiss persists per session</s-list-item>
            <s-list-item>CSS inherits theme styles</s-list-item>
            <s-list-item>Mobile-first (375px)</s-list-item>
            <s-list-item>No widget on /checkout</s-list-item>
          </s-unordered-list>

          <s-text fontWeight="bold">Files</s-text>
          <s-unordered-list>
            <s-list-item>
              <code>smartrec-widget-renderer.js</code> — 22KB / 5.5KB gz
            </s-list-item>
            <s-list-item>
              <code>smartrec-signal-collector.js</code> — 2KB
            </s-list-item>
            <s-list-item>
              <code>proxy-handlers.server.ts</code> — Intent Engine
            </s-list-item>
          </s-unordered-list>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
