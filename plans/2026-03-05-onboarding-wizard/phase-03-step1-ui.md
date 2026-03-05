# Phase 3: Step 1 — Feature Selection UI

**Est: 30 min**

---

## Goal

Render 4 widget cards. Each has:
- Widget name
- Short description (what it does for the merchant)
- Small illustration (placeholder icon or SVG)
- Toggle ON/OFF (all ON by default)

State is local React state — no server call until Step 3.

---

## Widget Definitions

```ts
const WIDGETS = [
  {
    id: "alternative_nudge" as const,
    name: "Alternative Nudge",
    description: "Gợi ý khi khách đang phân vân về size hoặc chất lượng sản phẩm",
    icon: "🔄", // replace with real SVG in polish phase
    triggerHint: "Kích hoạt khi khách mở bảng size hoặc đọc reviews lâu",
  },
  {
    id: "comparison_bar" as const,
    name: "Comparison Bar",
    description: "Thanh so sánh khi khách đang xem nhiều sản phẩm cùng loại",
    icon: "⚖️",
    triggerHint: "Kích hoạt khi khách xem ≥2 sản phẩm cùng danh mục",
  },
  {
    id: "tag_navigator" as const,
    name: "Tag Navigator",
    description: "Panel gợi ý danh mục khi khách back nhiều lần mà chưa mua",
    icon: "🧭",
    triggerHint: "Kích hoạt sau 3 lần back mà giỏ hàng trống",
  },
  {
    id: "trust_nudge" as const,
    name: "Trust Nudge",
    description: "Hiện đánh giá sao và chính sách đổi trả khi khách do dự ở giỏ hàng",
    icon: "⭐",
    triggerHint: "Kích hoạt khi khách ở trang cart > 60 giây",
  },
];
```

---

## Component Structure

```tsx
// app/routes/app.onboarding.tsx

type WidgetId = "alternative_nudge" | "comparison_bar" | "tag_navigator" | "trust_nudge";
type WizardStep = 1 | 2 | 3;

export default function OnboardingWizard() {
  const { shop } = useLoaderData<typeof loader>();
  const [step, setStep] = useState<WizardStep>(1);
  const [enabledWidgets, setEnabledWidgets] = useState<Record<WidgetId, boolean>>({
    alternative_nudge: true,
    comparison_bar: true,
    tag_navigator: true,
    trust_nudge: true,
  });

  const toggleWidget = (id: WidgetId) =>
    setEnabledWidgets(prev => ({ ...prev, [id]: !prev[id] }));

  const enabledCount = Object.values(enabledWidgets).filter(Boolean).length;

  if (step === 1) return <Step1 widgets={enabledWidgets} onToggle={toggleWidget} onNext={() => setStep(2)} />;
  if (step === 2) return <Step2 widgets={enabledWidgets} shop={shop} onBack={() => setStep(1)} onNext={() => setStep(3)} />;
  return <Step3 enabledCount={enabledCount} widgets={enabledWidgets} shop={shop} />;
}
```

---

## Step 1 Render (Polaris Web Components)

```tsx
function Step1({
  widgets, onToggle, onNext
}: {
  widgets: Record<WidgetId, boolean>;
  onToggle: (id: WidgetId) => void;
  onNext: () => void;
}) {
  return (
    <s-page heading="Chào mừng đến với SmartRec 👋">
      <s-section heading="Bước 1/3 — Chọn tính năng bạn muốn bật">
        <s-paragraph>
          Tất cả tính năng đều bật mặc định. Tắt những cái bạn không cần.
        </s-paragraph>

        <s-stack direction="block" gap="base">
          {WIDGETS.map((w) => (
            <s-box
              key={w.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background={widgets[w.id as WidgetId] ? "default" : "subdued"}
            >
              <s-stack direction="inline" gap="base" align="space-between">
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" gap="tight">
                    <s-text variant="headingMd">{w.icon} {w.name}</s-text>
                  </s-stack>
                  <s-paragraph>{w.description}</s-paragraph>
                  <s-text tone="subdued" variant="bodySm">{w.triggerHint}</s-text>
                </s-stack>
                {/* Toggle — use s-checkbox or s-button for now */}
                <s-button
                  variant={widgets[w.id as WidgetId] ? "primary" : "tertiary"}
                  onClick={() => onToggle(w.id as WidgetId)}
                >
                  {widgets[w.id as WidgetId] ? "Bật" : "Tắt"}
                </s-button>
              </s-stack>
            </s-box>
          ))}
        </s-stack>

        <s-stack direction="inline" gap="base">
          <s-button variant="primary" onClick={onNext}>
            Tiếp theo →
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
```

**Note on Toggle**: Polaris web components use `s-checkbox` for toggles. If it supports a "switch" variant, prefer that. Otherwise, styled `s-button` is acceptable for MVP.

---

## Visual Layout (Step 1)

```
┌─────────────────────────────────────────────────┐
│  Chào mừng đến với SmartRec 👋                  │
│  Bước 1/3 — Chọn tính năng bạn muốn bật        │
│                                                  │
│  ┌─────────────────────────────────── [BẬT] ─┐  │
│  │ 🔄 Alternative Nudge                       │  │
│  │ Gợi ý khi khách đang phân vân về size...   │  │
│  │ Kích hoạt khi khách mở bảng size...        │  │
│  └────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────── [BẬT] ─┐  │
│  │ ⚖️ Comparison Bar                          │  │
│  │ ...                                        │  │
│  └────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────── [TẮT] ─┐  │
│  │ 🧭 Tag Navigator (disabled state)          │  │
│  └────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────── [BẬT] ─┐  │
│  │ ⭐ Trust Nudge                             │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [Tiếp theo →]                                   │
└─────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

- [ ] All 4 widget cards render with name, description, trigger hint
- [ ] Toggle button switches between "Bật" / "Tắt" and card visual changes (background)
- [ ] At least 1 widget must remain on (disable "Next" if all toggled off — or warn)
- [ ] Clicking "Tiếp theo" advances to Step 2 with current toggle state preserved
- [ ] No server call in Step 1
