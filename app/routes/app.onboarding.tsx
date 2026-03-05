import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { authenticate } from "~/shopify.server";
import { WIDGETS, type WidgetId, type WizardStep } from "~/types/onboarding";
import type { DemoProduct } from "~/routes/api.onboarding";

type OnboardingApiData = {
  shop: string;
  storeUrl: string;
  demoProducts: DemoProduct[];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { n: 1, label: "Chọn tính năng" },
    { n: 2, label: "Xem thử" },
    { n: 3, label: "Go live" },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        padding: "16px 24px",
        borderBottom: "1px solid #e1e3e5",
      }}
    >
      {steps.map((s, i) => (
        <div
          key={s.n}
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: s.n <= current ? "#000" : "#e1e3e5",
              color: s.n <= current ? "#fff" : "#999",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {s.n < current ? "✓" : s.n}
          </div>
          <span
            style={{
              marginLeft: 8,
              fontSize: 13,
              color: s.n === current ? "#000" : "#999",
              fontWeight: s.n === current ? 600 : 400,
            }}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                margin: "0 12px",
                background: s.n < current ? "#000" : "#e1e3e5",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Step1({
  widgets,
  onToggle,
  onNext,
}: {
  widgets: Record<WidgetId, boolean>;
  onToggle: (id: WidgetId) => void;
  onNext: () => void;
}) {
  const enabledCount = Object.values(widgets).filter(Boolean).length;

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
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="base">
                    <s-text>
                      {w.icon} {w.name}
                    </s-text>
                  </s-stack>
                  <s-paragraph>{w.description}</s-paragraph>
                  <s-text tone="neutral">{w.triggerHint}</s-text>
                </s-stack>
                <s-button
                  variant={
                    widgets[w.id as WidgetId] ? "primary" : "tertiary"
                  }
                  onClick={() => onToggle(w.id as WidgetId)}
                >
                  {widgets[w.id as WidgetId] ? "Bật" : "Tắt"}
                </s-button>
              </div>
            </s-box>
          ))}
        </s-stack>

        {enabledCount === 0 && (
          <s-paragraph tone="critical">
            Vui lòng bật ít nhất 1 tính năng để tiếp tục.
          </s-paragraph>
        )}

        <s-stack direction="inline" gap="base">
          <s-button
            variant="primary"
            onClick={onNext}
            {...(enabledCount === 0 ? { disabled: true } : {})}
          >
            Tiếp theo →
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

type MockProduct = { id: string; title: string; price: string; image: string | null };

const fallbackProducts: MockProduct[] = [
  { id: "1", title: "Demo Product 1", price: "29.99", image: null },
  { id: "2", title: "Demo Product 2", price: "39.99", image: null },
];

function MockAlternativeNudge({ products }: { products: MockProduct[] }) {
  const p = products.length ? products : fallbackProducts;
  return (
    <div className="sr-mock-widget">
      <div className="sr-mock-header">
        <span>Không chắc chắn? Khách hàng tương tự cũng xem:</span>
      </div>
      <div className="sr-mock-product-list">
        {p.slice(0, 2).map((prod) => (
          <div key={prod.id} className="sr-mock-card">
            {prod.image ? (
              <img src={prod.image} alt="" width={80} height={80} />
            ) : (
              <div className="sr-mock-img" />
            )}
            <div>
              <div className="sr-mock-title">{prod.title}</div>
              <div className="sr-mock-price">${prod.price}</div>
              <button type="button" className="sr-mock-btn">
                Xem
              </button>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-mock-badge">✨ Preview</span>
    </div>
  );
}

function MockComparisonBar({ products }: { products: MockProduct[] }) {
  const p = products.length ? products[0] : fallbackProducts[0];
  return (
    <div className="sr-mock-widget sr-mock-bar">
      <span>Bạn cũng đang xem:</span>
      {p?.image && <img src={p.image} alt="" width={40} height={40} />}
      <span>{p?.title ?? "Product"}</span>
      <span className="sr-mock-price">${p?.price ?? "0"}</span>
      <button type="button" className="sr-mock-btn">
        So sánh
      </button>
      <span className="sr-mock-badge">✨ Preview</span>
    </div>
  );
}

function MockTagNavigator() {
  return (
    <div className="sr-mock-widget sr-mock-tags">
      <div className="sr-mock-header">Vẫn đang tìm? Thử lọc theo:</div>
      <div className="sr-mock-tag-list">
        <button type="button" className="sr-mock-tag">
          áo thun
        </button>
        <button type="button" className="sr-mock-tag">
          size M
        </button>
        <button type="button" className="sr-mock-tag">
          màu đen
        </button>
      </div>
      <span className="sr-mock-badge">✨ Preview</span>
    </div>
  );
}

function MockTrustNudge({ products }: { products: MockProduct[] }) {
  const p = products.length ? products[0] : fallbackProducts[0];
  return (
    <div className="sr-mock-widget sr-mock-trust">
      <div className="sr-mock-trust-row">
        <span className="sr-mock-stars">★★★★★</span>
        <span>{p?.title ?? "Sản phẩm"} — 4.8★ từ 234 đánh giá</span>
      </div>
      <div className="sr-mock-trust-row">
        <span>↩</span>
        <span>Đổi trả miễn phí trong 30 ngày</span>
      </div>
      <span className="sr-mock-badge">✨ Preview</span>
    </div>
  );
}

function Step2({
  widgets,
  onBack,
  onNext,
}: {
  widgets: Record<WidgetId, boolean>;
  shop: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const fetcher = useFetcher<OnboardingApiData>();
  const [activePreview, setActivePreview] = useState<WidgetId | null>(null);

  useEffect(() => {
    fetcher.load("/api/onboarding");
  }, []);

  const demoProducts: MockProduct[] =
    (fetcher.data?.demoProducts ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.image,
    }));
  const isLoading = fetcher.state === "loading";

  const renderMockWidget = () => {
    if (!activePreview) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#6d7175",
            fontSize: 14,
          }}
        >
          Chọn &quot;Xem thử&quot; để xem widget với sản phẩm từ store của bạn
        </div>
      );
    }
    switch (activePreview) {
      case "alternative_nudge":
        return <MockAlternativeNudge products={demoProducts} />;
      case "comparison_bar":
        return <MockComparisonBar products={demoProducts} />;
      case "tag_navigator":
        return <MockTagNavigator />;
      case "trust_nudge":
        return <MockTrustNudge products={demoProducts} />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 56px)",
        gap: 0,
      }}
    >
      <div
        style={{
          width: 360,
          padding: "24px 20px",
          overflowY: "auto",
          borderRight: "1px solid #e1e3e5",
          flexShrink: 0,
        }}
      >
        <s-stack direction="block" gap="base">
          <s-heading>Bước 2/3 — Xem thử widget</s-heading>
          <s-paragraph>
            Click &quot;Xem thử&quot; để xem mẫu từng widget với sản phẩm thật từ
            store của bạn.
          </s-paragraph>

          {isLoading && <s-spinner />}

          {WIDGETS.filter((w) => widgets[w.id as WidgetId]).map((w) => (
            <s-box
              key={w.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="base">
                <s-text>
                  {w.icon} {w.name}
                </s-text>
                <s-paragraph>{w.description}</s-paragraph>
                <s-button
                  onClick={() => setActivePreview(w.id as WidgetId)}
                  {...(isLoading ? { disabled: true } : {})}
                >
                  {activePreview === w.id ? "✓ Đang hiển thị" : "Xem thử"}
                </s-button>
              </s-stack>
            </s-box>
          ))}

          {WIDGETS.filter((w) => !widgets[w.id as WidgetId]).map((w) => (
            <s-box key={w.id} padding="base" borderRadius="base">
              <s-text tone="neutral">
                {w.icon} {w.name} — Đã tắt
              </s-text>
            </s-box>
          ))}

          <s-stack direction="inline" gap="base">
            <s-button onClick={onBack}>← Quay lại</s-button>
            <s-button variant="primary" onClick={onNext}>
              Tiếp theo →
            </s-button>
          </s-stack>
        </s-stack>
      </div>

      <div
        style={{
          flex: 1,
          padding: 24,
          background: "#f9fafb",
          overflowY: "auto",
        }}
      >
        <style>{`
          .sr-mock-widget{background:#fff;border:1px solid #e1e3e5;border-radius:8px;padding:16px;font-family:inherit;max-width:600px;position:relative;box-shadow:0 1px 3px rgba(0,0,0,.08)}
          .sr-mock-header{font-weight:500;margin-bottom:12px}
          .sr-mock-product-list{display:flex;gap:12px;flex-wrap:wrap}
          .sr-mock-card{display:flex;gap:8px;border:1px solid #f0f0f0;border-radius:6px;padding:8px;background:#fff}
          .sr-mock-img{width:80px;height:80px;background:#f0f0f0;border-radius:4px}
          .sr-mock-title{font-size:13px;font-weight:500}
          .sr-mock-price{font-size:13px;color:#333}
          .sr-mock-btn{margin-top:4px;padding:4px 12px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px}
          .sr-mock-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
          .sr-mock-tags{max-width:320px}
          .sr-mock-tag-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
          .sr-mock-tag{padding:6px 12px;border:1px solid #000;border-radius:20px;background:none;cursor:pointer;font-size:13px}
          .sr-mock-trust{background:#f6f6f7}
          .sr-mock-trust-row{display:flex;gap:8px;align-items:center;margin-bottom:6px;font-size:14px}
          .sr-mock-stars{color:#f4b400}
          .sr-mock-badge{position:absolute;top:8px;right:12px;font-size:10px;background:#5c6ac4;color:#fff;padding:2px 6px;border-radius:4px}
        `}</style>
        {renderMockWidget()}
      </div>
    </div>
  );
}

function Step3({
  enabledCount,
  widgets,
}: {
  enabledCount: number;
  widgets: Record<WidgetId, boolean>;
}) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.ok) {
      setDone(true);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => navigate("/app"), 2500);
      return () => clearTimeout(timer);
    }
  }, [done, navigate]);

  const goLive = () => {
    fetcher.submit(
      { widgets: JSON.stringify(widgets) },
      {
        method: "POST",
        action: "/api/config",
      }
    );
  };

  if (done) {
    return (
      <s-page heading="SmartRec đang chạy! 🎉">
        <s-section>
          <s-stack direction="block" gap="base">
            <div style={{ fontSize: 64 }}>✅</div>
            <s-heading>
              Xong! SmartRec đang chạy trên store của bạn.
            </s-heading>
            <s-paragraph>
              {enabledCount}/4 tính năng đã được bật. Bạn có thể thay đổi bất cứ
              lúc nào trong phần Cài đặt.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-link href="/app">Xem Dashboard →</s-link>
              <s-link href="/app/additional">Cài đặt</s-link>
            </s-stack>
            <s-text tone="neutral">
              Đang chuyển đến dashboard...
            </s-text>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Bước 3/3 — Go live">
      <s-section heading="Tóm tắt cấu hình">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Bạn đã chọn bật <strong>{enabledCount}/4</strong> tính năng.
          </s-paragraph>

          <s-stack direction="block" gap="base">
            {WIDGETS.map((w) => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <s-text>
                  {w.icon} {w.name}
                </s-text>
                <s-badge tone={widgets[w.id as WidgetId] ? "success" : "neutral"}>
                  {widgets[w.id as WidgetId] ? "Bật" : "Tắt"}
                </s-badge>
              </div>
            ))}
          </s-stack>

          <s-box padding="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>
                Chuyện gì sẽ xảy ra khi bạn click?
              </s-text>
              <s-unordered-list>
                <s-list-item>Cài đặt của bạn được lưu lại</s-list-item>
                <s-list-item>
                  SmartRec script được nhúng vào storefront
                </s-list-item>
                <s-list-item>Widgets bắt đầu hoạt động ngay lập tức</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>

          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              onClick={goLive}
              {...(isSubmitting ? { loading: true } : {})}
            >
              {isSubmitting ? "Đang xử lý..." : "🚀 Bật SmartRec cho store"}
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export default function OnboardingWizard() {
  const { shop } = useLoaderData<typeof loader>();
  const [step, setStep] = useState<WizardStep>(1);
  const [enabledWidgets, setEnabledWidgets] = useState<
    Record<WidgetId, boolean>
  >({
    alternative_nudge: true,
    comparison_bar: true,
    tag_navigator: true,
    trust_nudge: true,
  });

  const toggleWidget = (id: WidgetId) =>
    setEnabledWidgets((prev) => ({ ...prev, [id]: !prev[id] }));

  const enabledCount = Object.values(enabledWidgets).filter(Boolean).length;

  return (
    <>
      <StepIndicator current={step} />
      {step === 1 && (
        <Step1
          widgets={enabledWidgets}
          onToggle={toggleWidget}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2
          widgets={enabledWidgets}
          shop={shop}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <Step3
          enabledCount={enabledCount}
          widgets={enabledWidgets}
        />
      )}
    </>
  );
}
