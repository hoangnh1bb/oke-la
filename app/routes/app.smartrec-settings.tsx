/**
 * app.smartrec-settings.tsx
 * SmartRec Settings admin page — widget toggles and intent score thresholds.
 * GET: loads ShopSettings. POST: saves updated settings.
 */
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getShopSettings } from "../lib/smartrec/shop-settings-adapter.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  return { settings };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();

  const boolField = (key: string) => form.get(key) === "true";
  const intField = (key: string, fallback: number) => {
    const v = parseInt(form.get(key) as string, 10);
    return isNaN(v) ? fallback : v;
  };

  await prisma.shopSettings.upsert({
    where: { shop },
    create: {
      shop,
      enabled: boolField("enabled"),
      widgetAlternativeNudge: boolField("widgetAlternativeNudge"),
      widgetComparisonBar: boolField("widgetComparisonBar"),
      widgetTagNavigator: boolField("widgetTagNavigator"),
      widgetTrustNudge: boolField("widgetTrustNudge"),
      thresholdBrowsing: intField("thresholdBrowsing", 30),
      thresholdConsidering: intField("thresholdConsidering", 55),
      thresholdHighConsideration: intField("thresholdHighConsideration", 75),
      thresholdStrongIntent: intField("thresholdStrongIntent", 89),
    },
    update: {
      enabled: boolField("enabled"),
      widgetAlternativeNudge: boolField("widgetAlternativeNudge"),
      widgetComparisonBar: boolField("widgetComparisonBar"),
      widgetTagNavigator: boolField("widgetTagNavigator"),
      widgetTrustNudge: boolField("widgetTrustNudge"),
      thresholdBrowsing: intField("thresholdBrowsing", 30),
      thresholdConsidering: intField("thresholdConsidering", 55),
      thresholdHighConsideration: intField("thresholdHighConsideration", 75),
      thresholdStrongIntent: intField("thresholdStrongIntent", 89),
    },
  });

  return { ok: true };
};

export default function SmartRecSettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const saving = fetcher.state !== "idle";

  // Show toast on successful save
  if (fetcher.state === "idle" && fetcher.data?.ok) {
    shopify.toast.show("Settings saved");
  }

  function boolValue(key: keyof typeof settings): string {
    return settings[key] ? "true" : "false";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // Checkboxes: convert checked state to "true"/"false"
    const checkboxes = form.querySelectorAll<HTMLInputElement>("input[type=checkbox]");
    checkboxes.forEach((cb) => {
      data.set(cb.name, cb.checked ? "true" : "false");
    });
    fetcher.submit(data, { method: "POST" });
  }

  return (
    <s-page heading="SmartRec Settings">
      <s-section heading="General">
        <form onSubmit={handleSubmit}>
            {/* Master enable */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={settings.enabled}
                />
                Enable SmartRec on storefront
              </label>
            </div>

            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e1e3e5" }} />

            {/* Widget toggles */}
            <p style={{ fontWeight: 600, marginBottom: "12px" }}>Widgets</p>
            {(
              [
                ["widgetAlternativeNudge", "Alternative Nudge (hesitating shoppers)"],
                ["widgetComparisonBar", "Comparison Bar (comparison shoppers)"],
                ["widgetTagNavigator", "Tag Navigator (lost shoppers)"],
                ["widgetTrustNudge", "Trust Nudge (cart doubt)"],
              ] as [keyof typeof settings, string][]
            ).map(([key, label]) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    name={key as string}
                    defaultChecked={!!settings[key]}
                  />
                  {label}
                </label>
              </div>
            ))}

            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e1e3e5" }} />

            {/* Threshold inputs */}
            <p style={{ fontWeight: 600, marginBottom: "12px" }}>Intent Score Thresholds (0–100)</p>
            {(
              [
                ["thresholdBrowsing", "Browsing (skip below this)"],
                ["thresholdConsidering", "Considering"],
                ["thresholdHighConsideration", "High Consideration"],
                ["thresholdStrongIntent", "Strong Intent (skip above this)"],
              ] as [keyof typeof settings, string][]
            ).map(([key, label]) => (
              <div key={key} style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                  {label}
                </label>
                <input
                  type="number"
                  name={key as string}
                  defaultValue={settings[key] as number}
                  min={0}
                  max={100}
                  style={{ width: "80px", padding: "6px 8px", border: "1px solid #c9cccf", borderRadius: "4px" }}
                />
                {/* Hidden fallback for booleans — not needed here */}
              </div>
            ))}

            {/* Hidden bool values for non-checkbox fields */}
            <input type="hidden" name="enabled" value={boolValue("enabled")} />

            <div style={{ marginTop: "20px" }}>
              <s-button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </s-button>
            </div>
        </form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
