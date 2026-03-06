import { useEffect, useRef, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { authenticate } from "~/shopify.server";
import { WIDGETS, type WidgetId, type WizardStep } from "~/types/onboarding";
import type { DemoProduct } from "~/routes/api.onboarding";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

type OnboardingApiData = {
  shop: string;
  storeUrl: string;
  demoProducts: DemoProduct[];
};

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { n: 1, label: "Choose features" },
    { n: 2, label: "Preview" },
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
    <s-page heading="Welcome to SmartRec 👋">
      <s-section heading="Step 1/3 — Choose features to enable">
        <s-paragraph>
          All features are enabled by default. Turn off the ones you don't need.
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
                  {widgets[w.id as WidgetId] ? "On" : "Off"}
                </s-button>
              </div>
            </s-box>
          ))}
        </s-stack>

        {enabledCount === 0 && (
          <s-paragraph tone="critical">
            Please enable at least 1 feature to continue.
          </s-paragraph>
        )}

        <s-stack direction="inline" gap="base">
          <s-button
            variant="primary"
            onClick={onNext}
            {...(enabledCount === 0 ? { disabled: true } : {})}
          >
            Next →
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

function Step2({
  widgets,
  shop,
  onBack,
  onNext,
}: {
  widgets: Record<WidgetId, boolean>;
  shop: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const fetcher = useFetcher<OnboardingApiData>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [activePreview, setActivePreview] = useState<WidgetId | null>(null);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    fetcher.load("/api/onboarding");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!iframeReady) setIframeError(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [iframeReady]);

  const storeUrl = fetcher.data?.storeUrl ?? `https://${shop}`;
  const demoProducts = fetcher.data?.demoProducts ?? [];

  const handleIframeLoad = () => {
    setTimeout(() => setIframeReady(true), 800);
  };

  const sendPreview = (widgetId: WidgetId) => {
    if (!iframeRef.current || !iframeReady) return;
    setActivePreview(widgetId);
    iframeRef.current.contentWindow?.postMessage(
      {
        type: "smartrec_preview_signal",
        widget: widgetId,
        products: demoProducts,
      },
      storeUrl
    );
  };

  const isLoading = fetcher.state === "loading";

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
          <s-heading>Step 2/3 — Preview on your store</s-heading>
          <s-paragraph>
            Click &quot;Preview&quot; to see each widget live on your store.
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
                  onClick={() => sendPreview(w.id as WidgetId)}
                  {...(!iframeReady || isLoading ? { disabled: true } : {})}
                >
                  {activePreview === w.id ? "✓ Showing" : "Preview"}
                </s-button>
              </s-stack>
            </s-box>
          ))}

          {WIDGETS.filter((w) => !widgets[w.id as WidgetId]).map((w) => (
            <s-box
              key={w.id}
              padding="base"
              background="subdued"
              borderRadius="base"
            >
            <s-text tone="neutral">
              {w.icon} {w.name} — Disabled
            </s-text>
            </s-box>
          ))}

          <s-stack direction="inline" gap="base">
            <s-button onClick={onBack}>← Back</s-button>
            <s-button variant="primary" onClick={onNext}>
              Next →
            </s-button>
          </s-stack>
        </s-stack>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        {iframeError && !iframeReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 24,
              background: "#f6f6f7",
              zIndex: 2,
            }}
          >
            <s-paragraph>Unable to load store preview.</s-paragraph>
            <s-text tone="neutral">
              Your store may have password protection enabled. You can still continue
              setup.
            </s-text>
            <s-button onClick={onNext} variant="primary">
              Skip and Continue →
            </s-button>
          </div>
        )}
        {!iframeReady && !iframeError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: "#f6f6f7",
              zIndex: 1,
            }}
          >
            <s-spinner />
            <s-text>Loading your store...</s-text>
            <s-text tone="neutral">
              (First load may take 5–10 seconds)
            </s-text>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={storeUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            opacity: iframeReady ? 1 : 0,
          }}
          title="Store Preview"
          onLoad={handleIframeLoad}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
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
      <s-page heading="SmartRec is running! 🎉">
        <s-section>
          <s-stack direction="block" gap="base">
            <div style={{ fontSize: 64 }}>✅</div>
            <s-heading>
              Done! SmartRec is running on your store.
            </s-heading>
            <s-paragraph>
              {enabledCount}/4 features enabled. You can change this anytime in Settings.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-link href="/app">Xem Dashboard →</s-link>
              <s-link href="/app/additional">Settings</s-link>
            </s-stack>
            <s-text tone="neutral">
              Redirecting to dashboard...
            </s-text>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Step 3/3 — Go live">
      <s-section heading="Configuration summary">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            You've chosen to enable <strong>{enabledCount}/4</strong> features.
          </s-paragraph>

          <s-stack direction="block" gap="base">
            {WIDGETS.map((w) => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <s-text>
                  {w.icon} {w.name}
                </s-text>
                <s-badge tone={widgets[w.id as WidgetId] ? "success" : "neutral"}>
                  {widgets[w.id as WidgetId] ? "On" : "Off"}
                </s-badge>
              </div>
            ))}
          </s-stack>

          <s-box padding="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>
                What happens when you click?
              </s-text>
              <s-unordered-list>
                <s-list-item>Your settings are saved</s-list-item>
                <s-list-item>
                  SmartRec script is embedded in your storefront
                </s-list-item>
                <s-list-item>Widgets start working immediately</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>

          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              onClick={goLive}
              {...(isSubmitting ? { loading: true } : {})}
            >
              {isSubmitting ? "Processing..." : "🚀 Enable SmartRec for your store"}
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
