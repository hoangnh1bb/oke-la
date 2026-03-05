# Phase 7: Polish & Edge Cases

**Est: 30 min**

---

## 7.1 — Preview Script Cleanup on Uninstall

The preview script tag may remain on the storefront if the merchant abandons onboarding and uninstalls.

**Existing webhook**: `webhooks.app.uninstalled.tsx` already exists.

Add cleanup logic:

```ts
// app/routes/webhooks.app.uninstalled.tsx — add to existing handler
import { deleteScriptTag } from "~/lib/script-tags.server";
import { getOrCreateConfig } from "~/lib/merchant-config.server";
import { prisma } from "~/db.server";

// Inside the action:
const config = await prisma.merchantConfig.findUnique({ where: { shop } });

// We can't call authenticated admin here (app already uninstalled)
// Script tags are auto-removed by Shopify on uninstall — no action needed
// But clean up the DB record:
if (config) {
  await prisma.merchantConfig.delete({ where: { shop } });
}
```

**Good news**: Shopify automatically removes all script tags when an app is uninstalled. No manual cleanup needed for the script tag itself.

---

## 7.2 — Step Progress Indicator

Add a visual step progress bar at the top of the wizard.

```tsx
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Chọn tính năng" },
    { n: 2, label: "Xem thử" },
    { n: 3, label: "Go live" },
  ];
  return (
    <div style={{ display: "flex", gap: 0, padding: "16px 24px", borderBottom: "1px solid #e1e3e5" }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: s.n <= current ? "#000" : "#e1e3e5",
            color: s.n <= current ? "#fff" : "#999",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 600, flexShrink: 0,
          }}>
            {s.n < current ? "✓" : s.n}
          </div>
          <span style={{
            marginLeft: 8, fontSize: 13,
            color: s.n === current ? "#000" : "#999",
            fontWeight: s.n === current ? 600 : 400,
          }}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: "0 12px",
              background: s.n < current ? "#000" : "#e1e3e5",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 7.3 — Prevent All-Off State

In Step 1, if merchant disables all 4 widgets, disable the "Next" button:

```tsx
const enabledCount = Object.values(enabledWidgets).filter(Boolean).length;

<s-button
  variant="primary"
  onClick={onNext}
  {...(enabledCount === 0 ? { disabled: true } : {})}
>
  Tiếp theo →
</s-button>

{enabledCount === 0 && (
  <s-paragraph tone="critical">
    Vui lòng bật ít nhất 1 tính năng để tiếp tục.
  </s-paragraph>
)}
```

---

## 7.4 — Iframe Load Failure

If the store is password-protected or fails to load, show a fallback:

```tsx
const [iframeError, setIframeError] = useState(false);

// If load takes > 15 seconds
useEffect(() => {
  const timer = setTimeout(() => {
    if (!iframeReady) setIframeError(true);
  }, 15000);
  return () => clearTimeout(timer);
}, [iframeReady]);

{iframeError && (
  <div style={{ padding: 24, textAlign: "center" }}>
    <s-paragraph>Không thể tải store preview.</s-paragraph>
    <s-text tone="subdued" variant="bodySm">
      Store của bạn có thể đang bật password. Bạn vẫn có thể tiếp tục setup.
    </s-text>
    <s-button onClick={onNext} variant="primary">
      Bỏ qua và Tiếp tục →
    </s-button>
  </div>
)}
```

---

## 7.5 — Mobile Responsive (Step 2)

The split-screen layout needs a fallback for mobile admin views:

```tsx
// Use CSS media query or detect window width
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 900);
  check();
  window.addEventListener('resize', check);
  return () => window.removeEventListener('resize', check);
}, []);

// On mobile: show tabs instead of split screen
// Tab 1: Widget selection + Preview buttons
// Tab 2: Storefront iframe
```

---

## 7.6 — TypeScript Types

Extract shared types into a separate file to avoid duplication:

**File**: `app/types/onboarding.ts`

```ts
export type WidgetId =
  | "alternative_nudge"
  | "comparison_bar"
  | "tag_navigator"
  | "trust_nudge";

export type WidgetConfig = Record<WidgetId, boolean>;

export type WizardStep = 1 | 2 | 3;

export const WIDGET_IDS: WidgetId[] = [
  "alternative_nudge",
  "comparison_bar",
  "tag_navigator",
  "trust_nudge",
];

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  alternative_nudge: true,
  comparison_bar: true,
  tag_navigator: true,
  trust_nudge: true,
};
```

---

## 7.7 — Linting & Type Checks

Run after all phases:

```bash
npm run typecheck   # react-router typegen + tsc --noEmit
npm run lint        # ESLint with cache
```

Common issues to watch for:
- Polaris web components props — use `@shopify/polaris-types` (already in tsconfig)
- `any` types in GraphQL response — type properly or cast
- `useNavigate` hook requires being inside a Router context — OK since we're inside `app.tsx`

---

## Final File List Summary

```
New files:
  app/routes/app.onboarding.tsx
  app/routes/api.onboarding.tsx
  app/routes/api.config.tsx
  app/lib/merchant-config.server.ts
  app/lib/script-tags.server.ts
  app/types/onboarding.ts
  public/smartrec-preview.js

Modified files:
  prisma/schema.prisma       (add MerchantConfig model)
  app/routes/app.tsx         (add onboarding redirect guard)
  app/routes/app._index.tsx  (replace template with stub dashboard)
  app/routes/webhooks.app.uninstalled.tsx  (add DB cleanup)

New migration:
  prisma/migrations/YYYYMMDD_add_merchant_config/migration.sql
```

---

## Acceptance Criteria (Overall Wizard)

- [ ] Fresh install → wizard shows (not dashboard)
- [ ] Step 1: 4 cards, toggle works, Next advances
- [ ] Step 2: iframe loads store, all 4 Preview buttons work, widgets appear in iframe
- [ ] Step 3: correct summary, "Bật SmartRec" works, success state → redirect
- [ ] Second visit → dashboard (wizard never shown again)
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors
- [ ] Preview script < 8KB
- [ ] No script-tag leak on uninstall (Shopify auto-cleans, DB record deleted)
