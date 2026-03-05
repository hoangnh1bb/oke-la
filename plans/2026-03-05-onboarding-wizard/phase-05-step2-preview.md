# Phase 5: Step 2 — Live Preview UI

**Est: 60 min** (most complex step)

---

## Goal

Split screen layout:
- **Left panel** (350px): 4 widget cards, each with a "Preview" button
- **Right panel** (flex-grow): `<iframe>` showing merchant's real storefront

When merchant clicks Preview for a widget → send `postMessage` to iframe with widget type + real product data.

---

## 5.1 — Loader: `api.onboarding.tsx`

**File**: `app/routes/api.onboarding.tsx`

Called once when entering Step 2. Responsibilities:
1. Authenticate
2. Fetch first 4 products (GraphQL)
3. Inject preview script tag
4. Save `previewScriptId` to DB
5. Return `{ demoProducts, storeUrl }`

```ts
// app/routes/api.onboarding.tsx
import type { LoaderFunctionArgs } from "react-router";
import { json } from "react-router";
import { authenticate } from "~/shopify.server";
import { getOrCreateConfig, saveConfig } from "~/lib/merchant-config.server";
import { injectPreviewScript } from "~/lib/script-tags.server";
import { getWidgetConfig } from "~/lib/merchant-config.server";

const FETCH_PRODUCTS_QUERY = `#graphql
  query FetchDemoProducts {
    products(first: 4) {
      edges {
        node {
          id
          title
          handle
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          featuredImage {
            url
            altText
          }
        }
      }
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch demo products
  const response = await admin.graphql(FETCH_PRODUCTS_QUERY);
  const data = await response.json();
  const products = data.data?.products?.edges?.map((e: any) => ({
    id: e.node.id,
    title: e.node.title,
    handle: e.node.handle,
    price: e.node.priceRange?.minVariantPrice?.amount ?? "0",
    currency: e.node.priceRange?.minVariantPrice?.currencyCode ?? "USD",
    image: e.node.featuredImage?.url ?? null,
  })) ?? [];

  // Inject preview script (idempotent — check if already injected)
  const config = await getOrCreateConfig(session.shop);
  let previewScriptId = config.previewScriptId;

  if (!previewScriptId) {
    previewScriptId = await injectPreviewScript(admin);
    await saveConfig(
      session.shop,
      JSON.parse(config.widgetConfig || "{}"),
      { previewScriptId: previewScriptId ?? undefined }
    );
  }

  return json({
    shop: session.shop,
    storeUrl: `https://${session.shop}`,
    demoProducts: products,
  });
};
```

**Note**: This route has no UI — it's used as a `fetcher` source from the wizard component. When merchant clicks "Next" on Step 1, the wizard calls `fetcher.load("/api/onboarding")`.

---

## 5.2 — Step 2 Component

```tsx
// Inside app.onboarding.tsx

import { useFetcher } from "react-router";

type DemoProduct = {
  id: string;
  title: string;
  price: string;
  currency: string;
  image: string | null;
};

type OnboardingApiData = {
  shop: string;
  storeUrl: string;
  demoProducts: DemoProduct[];
};

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

  // Load demo products + inject preview script when Step 2 mounts
  useEffect(() => {
    fetcher.load("/api/onboarding");
  }, []);

  const storeUrl = fetcher.data?.storeUrl ?? `https://${shop}`;
  const demoProducts = fetcher.data?.demoProducts ?? [];

  const sendPreview = (widgetId: WidgetId) => {
    if (!iframeRef.current || !iframeReady) return;
    setActivePreview(widgetId);
    iframeRef.current.contentWindow?.postMessage(
      {
        type: "smartrec_preview_signal",
        widget: widgetId,
        products: demoProducts,
      },
      storeUrl // targetOrigin — must match iframe src origin exactly
    );
  };

  const isLoading = fetcher.state === "loading";

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", gap: 0 }}>
      {/* Left panel */}
      <div style={{ width: 360, padding: "24px 20px", overflowY: "auto", borderRight: "1px solid #e1e3e5", flexShrink: 0 }}>
        <s-stack direction="block" gap="base">
          <s-heading>Bước 2/3 — Xem thử trên store</s-heading>
          <s-paragraph>
            Click "Xem thử" để preview từng widget trực tiếp trên store của bạn.
          </s-paragraph>

          {isLoading && <s-spinner />}

          {WIDGETS.filter(w => widgets[w.id as WidgetId]).map(w => (
            <s-box
              key={w.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background={activePreview === w.id ? "highlight" : "default"}
            >
              <s-stack direction="block" gap="tight">
                <s-text variant="headingMd">{w.icon} {w.name}</s-text>
                <s-paragraph>{w.description}</s-paragraph>
                <s-button
                  onClick={() => sendPreview(w.id as WidgetId)}
                  {...(!iframeReady || isLoading ? { disabled: true } : {})}
                >
                  {activePreview === w.id ? "✓ Đang hiển thị" : "Xem thử"}
                </s-button>
              </s-stack>
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

      {/* Right panel: iframe */}
      <div style={{ flex: 1, position: "relative" }}>
        {!iframeReady && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "#f6f6f7", zIndex: 1
          }}>
            <s-stack direction="block" gap="base" alignment="center">
              <s-spinner />
              <s-text>Đang tải store của bạn...</s-text>
              <s-text tone="subdued" variant="bodySm">
                (Lần đầu có thể mất 5–10 giây)
              </s-text>
            </s-stack>
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
          onLoad={() => setIframeReady(true)}
          // Allow scripts to run in iframe
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
```

---

## 5.3 — Iframe Sandbox Considerations

The iframe `sandbox` attribute must include:
- `allow-scripts` — preview script must execute
- `allow-same-origin` — needed for localStorage access in storefront
- `allow-forms` — for any cart/form interactions in the preview

Without `allow-same-origin`, the iframe is opaque — cookies and localStorage won't work, and some storefront JS may break. Since we're loading the merchant's own store, `allow-same-origin` is safe.

---

## 5.4 — Cross-Origin PostMessage

```
Admin App origin: https://our-app.fly.dev (embedded in Shopify Admin iframe)
Storefront iframe: https://{shop}.myshopify.com

postMessage flow:
  Admin app → storefront iframe (postMessage with targetOrigin = shop URL)
  Preview script in storefront → receives message, renders widget
```

`iframeRef.contentWindow.postMessage(data, targetOrigin)` works cross-origin by design. We must specify `targetOrigin` exactly — not `'*'` — as a security best practice.

---

## 5.5 — Timing: Script Tag Propagation Delay

After `scriptTagCreate`, there's a short propagation delay before the script actually appears on the storefront (usually < 30 seconds, sometimes instant in dev stores).

**Mitigation strategies**:
- Show a "Đang chuẩn bị preview..." state for 3–5 seconds before loading iframe
- Add a "Tải lại iframe" button if preview widgets don't appear
- In the `onLoad` handler, wait 2 extra seconds before enabling Preview buttons

```ts
const handleIframeLoad = () => {
  // Small delay to ensure preview script has initialized
  setTimeout(() => setIframeReady(true), 1500);
};
```

---

## 5.6 — Disable Preview for Toggled-Off Widgets

In Step 2, only show Preview buttons for widgets the merchant enabled in Step 1.

```tsx
{WIDGETS.filter(w => widgets[w.id as WidgetId]).map(w => (
  // ... preview card
))}

{WIDGETS.filter(w => !widgets[w.id as WidgetId]).map(w => (
  <s-box key={w.id} padding="base" background="subdued" borderRadius="base">
    <s-text tone="subdued">{w.icon} {w.name} — Đã tắt</s-text>
  </s-box>
))}
```

---

## Acceptance Criteria

- [ ] Storefront iframe loads merchant's actual store
- [ ] Loading state shown while iframe + script are initializing
- [ ] Clicking "Xem thử" on Alternative Nudge → widget appears in iframe
- [ ] Clicking "Xem thử" on Comparison Bar → comparison strip appears
- [ ] Clicking "Xem thử" on Tag Navigator → slide-in panel appears
- [ ] Clicking "Xem thử" on Trust Nudge → trust signals appear
- [ ] Previously shown widget is cleared when a new preview is triggered
- [ ] Disabled widgets show "Đã tắt" state, no Preview button
- [ ] "← Quay lại" preserves Step 1 toggle state
- [ ] "Tiếp theo →" advances to Step 3
