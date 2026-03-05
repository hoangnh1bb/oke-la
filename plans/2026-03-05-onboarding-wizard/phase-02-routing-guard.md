# Phase 2: Routing & Onboarding Guard

**Est: 20 min**

---

## Goal

- New merchant (not onboarded) → auto-redirect to `/app/onboarding`
- Returning merchant → `/app` dashboard as normal
- Guard lives in `app.tsx` layout loader (runs for all `/app/*` routes)

---

## 2.1 — Modify `app.tsx` Loader

**File**: `app/routes/app.tsx`

Add `isOnboarded` check. If false AND not already on `/app/onboarding`, redirect.

```ts
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError, redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { isOnboarded } from "~/lib/merchant-config.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const onOnboardingRoute = url.pathname === "/app/onboarding";

  if (!onOnboardingRoute) {
    const onboarded = await isOnboarded(session.shop);
    if (!onboarded) {
      throw redirect("/app/onboarding");
    }
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
```

**Important**: Keep `authenticate.admin(request)` as first call (required for Shopify OAuth).

---

## 2.2 — Create Route File: `app.onboarding.tsx`

**File**: `app/routes/app.onboarding.tsx`

Shell for now — implemented in Phases 3–6.

```ts
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function OnboardingWizard() {
  const { shop } = useLoaderData<typeof loader>();
  // Implemented in Phase 3–6
  return <div>Onboarding — shop: {shop}</div>;
}
```

---

## 2.3 — Register Route in `routes.ts`

React Router v7 uses `@react-router/fs-routes` with `flatRoutes()`. The file naming convention `app.onboarding.tsx` auto-registers as `/app/onboarding` — no manual registration needed.

**Verify**: Run `npm run typecheck` to confirm route type generation includes `app.onboarding`.

---

## 2.4 — Update Nav in `app.tsx`

After onboarding, the nav shows proper links. During onboarding (the wizard), no nav needed — we'll conditionally hide nav using a route check OR just not render `<s-app-nav>` in the onboarding route since it has its own layout.

**Option**: Keep `app.tsx` nav, but `app.onboarding.tsx` renders fullscreen without the `s-page` wrapper that implies nav context. The `<s-app-nav>` will still render but that's OK — wizard is the main content area.

---

## Acceptance Criteria

- [ ] Fresh install (no `MerchantConfig`) → navigating to `/app` redirects to `/app/onboarding`
- [ ] After `onboarded = true` → `/app` loads dashboard normally
- [ ] `/app/onboarding` accessible without triggering the redirect guard (prevents infinite loop)
- [ ] `npm run typecheck` passes with new route
