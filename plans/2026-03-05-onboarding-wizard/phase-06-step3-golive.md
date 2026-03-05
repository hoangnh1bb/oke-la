# Phase 6: Step 3 — Go Live

**Est: 30 min**

---

## Goal

Show summary of enabled widgets. Merchant clicks "Bật SmartRec cho store" → saves config + injects production script → redirects to dashboard.

---

## 6.1 — Step 3 Component

```tsx
function Step3({
  enabledCount,
  widgets,
  shop,
}: {
  enabledCount: number;
  widgets: Record<WidgetId, boolean>;
  shop: string;
}) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const isSubmitting = fetcher.state === "submitting";

  // Watch for success response
  useEffect(() => {
    if (fetcher.data?.ok) {
      setDone(true);
    }
  }, [fetcher.data]);

  // Redirect to dashboard after short celebration
  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => navigate("/app"), 2500);
      return () => clearTimeout(timer);
    }
  }, [done, navigate]);

  const goLive = () => {
    fetcher.submit(
      { widgets: JSON.stringify(widgets) } as any,
      {
        method: "POST",
        action: "/api/config",
        encType: "application/json",
      }
    );
  };

  if (done) {
    return (
      <s-page heading="SmartRec đang chạy! 🎉">
        <s-section>
          <s-stack direction="block" gap="base" alignment="center">
            <div style={{ fontSize: 64 }}>✅</div>
            <s-heading>Xong! SmartRec đang chạy trên store của bạn.</s-heading>
            <s-paragraph>
              {enabledCount}/4 tính năng đã được bật. Bạn có thể thay đổi bất cứ lúc nào trong phần Cài đặt.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-link href="/app/analytics">Xem Analytics →</s-link>
              <s-link href="/app/settings">Cài đặt</s-link>
            </s-stack>
            <s-text tone="subdued" variant="bodySm">Đang chuyển đến dashboard...</s-text>
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

          <s-stack direction="block" gap="tight">
            {WIDGETS.map(w => (
              <s-stack key={w.id} direction="inline" gap="base" align="space-between">
                <s-text>{w.icon} {w.name}</s-text>
                <s-badge tone={widgets[w.id as WidgetId] ? "success" : "default"}>
                  {widgets[w.id as WidgetId] ? "Bật" : "Tắt"}
                </s-badge>
              </s-stack>
            ))}
          </s-stack>

          <s-box
            padding="base"
            borderRadius="base"
            background="highlight"
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="headingMd">Chuyện gì sẽ xảy ra khi bạn click?</s-text>
              <s-unordered-list>
                <s-list-item>Cài đặt của bạn được lưu lại</s-list-item>
                <s-list-item>SmartRec script được nhúng vào storefront</s-list-item>
                <s-list-item>Widgets bắt đầu hoạt động ngay lập tức</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>

          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              size="large"
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
```

---

## 6.2 — POST `/api/config` Action (Phase 1 already covers this)

Recall from Phase 1 (`api.config.tsx` action):

```ts
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json() as { widgets: string };
  const widgets = JSON.parse(body.widgets);

  const existing = await getOrCreateConfig(session.shop);

  // Remove preview script
  if (existing.previewScriptId) {
    await deleteScriptTag(admin, existing.previewScriptId);
  }

  // Inject production script
  const scriptTagId = await injectProductionScript(admin);

  await saveConfig(session.shop, widgets, {
    scriptTagId: scriptTagId ?? undefined,
    previewScriptId: undefined,
    onboarded: true,
  });

  return json({ ok: true });
};
```

**Note on `submit` encoding**: Use `encType: "application/json"` in `fetcher.submit()` and ensure the action reads `request.json()`. Alternatively pass as `application/x-www-form-urlencoded` with `JSON.stringify` as a string field.

---

## 6.3 — Fetch Submit Payload

```ts
// Step 3 calls POST /api/config with widgets JSON
fetcher.submit(
  { widgets: JSON.stringify(widgets) },
  {
    method: "POST",
    action: "/api/config",
    encType: "application/x-www-form-urlencoded",
  }
);
```

Update `api.config.tsx` action to parse form data:

```ts
const formData = await request.formData();
const widgetsJson = formData.get("widgets") as string;
const widgets = JSON.parse(widgetsJson);
```

Using form encoding is simpler than JSON body for React Router fetchers.

---

## 6.4 — Dashboard Stub (Post-Onboarding)

After redirect to `/app`, the dashboard needs to not be just the template boilerplate. For now, show a minimal "SmartRec is running" status:

**File**: `app/routes/app._index.tsx` — replace boilerplate with:

```tsx
export default function Index() {
  return (
    <s-page heading="SmartRec Dashboard">
      <s-section heading="Status">
        <s-paragraph>SmartRec đang chạy trên store của bạn.</s-paragraph>
        <s-link href="/app/settings">Cài đặt widgets →</s-link>
      </s-section>
    </s-page>
  );
}
```

Full dashboard is out of scope for this feature build.

---

## Acceptance Criteria

- [ ] Step 3 shows correct count "X/4 tính năng"
- [ ] Each widget shows Bật/Tắt badge matching Step 1 selections
- [ ] Clicking "Bật SmartRec" triggers POST `/api/config`
- [ ] POST saves to DB: `onboarded = true`, `widgetConfig` set, preview script removed, production script injected
- [ ] After success: checkmark + "Xong!" message shows for ~2.5s
- [ ] Auto-redirects to `/app` dashboard
- [ ] "Xem Analytics" link visible in success state
- [ ] Second visit to app goes to dashboard (not wizard)
