# Phase 1: Database & Config API

**Est: 45 min**

---

## 1.1 — Prisma Schema: Add `MerchantConfig`

**File**: `prisma/schema.prisma`

Add after the existing `Session` model:

```prisma
model MerchantConfig {
  id              String   @id @default(cuid())
  shop            String   @unique
  onboarded       Boolean  @default(false)
  widgetConfig    String   @default("{}")
  previewScriptId String?
  scriptTagId     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

`widgetConfig` stores JSON as String (SQLite has no native JSON type):
```json
{
  "alternative_nudge": true,
  "comparison_bar": true,
  "tag_navigator": true,
  "trust_nudge": true
}
```

**Command**: `npx prisma migrate dev --name add_merchant_config`

---

## 1.2 — Server Helper: `merchant-config.server.ts`

**File**: `app/lib/merchant-config.server.ts`

```ts
import { prisma } from "~/db.server";

export type WidgetConfig = {
  alternative_nudge: boolean;
  comparison_bar: boolean;
  tag_navigator: boolean;
  trust_nudge: boolean;
};

const DEFAULT_WIDGETS: WidgetConfig = {
  alternative_nudge: true,
  comparison_bar: true,
  tag_navigator: true,
  trust_nudge: true,
};

export async function getOrCreateConfig(shop: string) {
  return prisma.merchantConfig.upsert({
    where: { shop },
    update: {},
    create: { shop },
  });
}

export async function getWidgetConfig(shop: string): Promise<WidgetConfig> {
  const config = await prisma.merchantConfig.findUnique({ where: { shop } });
  if (!config) return DEFAULT_WIDGETS;
  try {
    return JSON.parse(config.widgetConfig) as WidgetConfig;
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export async function saveConfig(
  shop: string,
  widgets: WidgetConfig,
  opts?: { scriptTagId?: string; previewScriptId?: string; onboarded?: boolean }
) {
  return prisma.merchantConfig.upsert({
    where: { shop },
    update: {
      widgetConfig: JSON.stringify(widgets),
      ...opts,
    },
    create: {
      shop,
      widgetConfig: JSON.stringify(widgets),
      onboarded: opts?.onboarded ?? false,
      scriptTagId: opts?.scriptTagId,
      previewScriptId: opts?.previewScriptId,
    },
  });
}

export async function isOnboarded(shop: string): Promise<boolean> {
  const config = await prisma.merchantConfig.findUnique({
    where: { shop },
    select: { onboarded: true },
  });
  return config?.onboarded ?? false;
}
```

---

## 1.3 — Server Helper: `script-tags.server.ts`

**File**: `app/lib/script-tags.server.ts`

Uses Shopify Admin GraphQL (`scriptTagCreate` / `scriptTagDelete`).

```ts
import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

const PREVIEW_SCRIPT_URL = `${process.env.SHOPIFY_APP_URL}/smartrec-preview.js`;
const PRODUCTION_SCRIPT_URL = `${process.env.SHOPIFY_APP_URL}/smartrec.js`;

export async function injectPreviewScript(admin: AdminApiContext["admin"]) {
  const response = await admin.graphql(`
    mutation CreateScriptTag($input: ScriptTagInput!) {
      scriptTagCreate(input: $input) {
        scriptTag { id }
        userErrors { field message }
      }
    }
  `, {
    variables: {
      input: {
        eventType: "ONLOAD",
        src: PREVIEW_SCRIPT_URL,
        cache: false,
      }
    }
  });
  const data = await response.json();
  return data.data?.scriptTagCreate?.scriptTag?.id ?? null;
}

export async function injectProductionScript(admin: AdminApiContext["admin"]) {
  const response = await admin.graphql(`
    mutation CreateScriptTag($input: ScriptTagInput!) {
      scriptTagCreate(input: $input) {
        scriptTag { id }
        userErrors { field message }
      }
    }
  `, {
    variables: {
      input: {
        eventType: "ONLOAD",
        src: PRODUCTION_SCRIPT_URL,
        cache: true,
      }
    }
  });
  const data = await response.json();
  return data.data?.scriptTagCreate?.scriptTag?.id ?? null;
}

export async function deleteScriptTag(
  admin: AdminApiContext["admin"],
  scriptTagId: string
) {
  await admin.graphql(`
    mutation DeleteScriptTag($id: ID!) {
      scriptTagDelete(id: $id) {
        deletedScriptTagId
        userErrors { field message }
      }
    }
  `, { variables: { id: scriptTagId } });
}
```

---

## 1.4 — API Route: `api.config.tsx`

**File**: `app/routes/api.config.tsx`

Handles:
- `GET`: return current merchant widget config
- `POST`: save widget config, replace script tags, mark onboarded

```ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { json } from "react-router";
import { authenticate } from "~/shopify.server";
import { getOrCreateConfig, saveConfig } from "~/lib/merchant-config.server";
import { injectProductionScript, injectPreviewScript, deleteScriptTag } from "~/lib/script-tags.server";
import type { WidgetConfig } from "~/lib/merchant-config.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const config = await getOrCreateConfig(session.shop);
  return json({
    onboarded: config.onboarded,
    widgetConfig: JSON.parse(config.widgetConfig || "{}"),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json() as { widgets: WidgetConfig };

  const existing = await getOrCreateConfig(session.shop);

  // Remove preview script if exists
  if (existing.previewScriptId) {
    await deleteScriptTag(admin, existing.previewScriptId);
  }

  // Inject production script
  const scriptTagId = await injectProductionScript(admin);

  await saveConfig(session.shop, body.widgets, {
    scriptTagId: scriptTagId ?? undefined,
    previewScriptId: null as unknown as undefined,
    onboarded: true,
  });

  return json({ ok: true });
};
```

---

## Acceptance Criteria

- [ ] `prisma migrate dev` succeeds, DB has `MerchantConfig` table
- [ ] `getOrCreateConfig("test.myshopify.com")` creates a row with defaults
- [ ] `isOnboarded` returns `false` for new shop
- [ ] `scriptTagCreate` mutation succeeds against dev store (check Shopify Admin → Apps → SmartRec → Script tags)
- [ ] POST `/api/config` with widget config → DB updated, `onboarded = true`
