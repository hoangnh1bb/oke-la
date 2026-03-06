import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getShopSettings } from "../lib/smartrec/shop-settings-adapter.server";
import { getTodaySummary } from "../lib/smartrec/analytics-query.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [settings, today] = await Promise.all([
    getShopSettings(session.shop),
    getTodaySummary(session.shop),
  ]);
  return { settings, today };
};

export default function Index() {
  const { settings, today } = useLoaderData<typeof loader>();

  return (
    <s-page heading="SmartRec Dashboard">
      <s-section heading="Status">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: settings.enabled ? "#10b981" : "#9ca3af",
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 600 }}>
              SmartRec is {settings.enabled ? "active" : "disabled"} on your storefront
            </span>
          </div>
          <s-link href="/app/smartrec-settings">Manage settings →</s-link>
        </div>
      </s-section>

      <s-section heading="Today's activity">
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              textAlign: "center",
            }}
          >
            <div>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 4px" }}>
                {today.triggeredToday}
              </p>
              <p style={{ fontSize: "13px", opacity: 0.6, margin: 0 }}>Triggered today</p>
            </div>
            <div>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 4px" }}>
                {today.clickedToday}
              </p>
              <p style={{ fontSize: "13px", opacity: 0.6, margin: 0 }}>Clicked today</p>
            </div>
            <div>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 4px" }}>
                {today.ctr}%
              </p>
              <p style={{ fontSize: "13px", opacity: 0.6, margin: 0 }}>CTR</p>
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <s-link href="/app/smartrec-analytics">View full analytics →</s-link>
          </div>
        </div>
      </s-section>

      <s-section heading="Quick links">
        <s-paragraph>SmartRec đang chạy trên store của bạn.</s-paragraph>
        <s-link href="/app/onboarding">Mở Onboarding wizard →</s-link>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
