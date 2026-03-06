/**
 * app.smartrec-analytics.tsx
 * SmartRec Analytics admin page — widget performance over last 7 days.
 * Shows triggered count, clicks, CTR%, and conversions per widget type.
 */
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getActionSummary,
  getTodaySummary,
} from "../lib/smartrec/analytics-query.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [summary, today] = await Promise.all([
    getActionSummary(session.shop, 7),
    getTodaySummary(session.shop),
  ]);
  return { summary, today };
};

const WIDGET_LABELS: Record<string, string> = {
  alternative_nudge: "Alternative Nudge",
  comparison_bar: "Comparison Bar",
  tag_navigator: "Tag Navigator",
  trust_nudge: "Trust Nudge",
};

export default function SmartRecAnalyticsPage() {
  const { summary, today } = useLoaderData<typeof loader>();

  return (
    <s-page heading="SmartRec Analytics">
      {/* Today summary */}
      <s-section heading="Today">
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
              <p style={{ fontSize: "13px", opacity: 0.6, margin: 0 }}>Triggered</p>
            </div>
            <div>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 4px" }}>
                {today.clickedToday}
              </p>
              <p style={{ fontSize: "13px", opacity: 0.6, margin: 0 }}>Clicked</p>
            </div>
            <div>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 4px" }}>
                {today.ctr}%
              </p>
              <p style={{ fontSize: "13px", opacity: 0.6, margin: 0 }}>CTR</p>
            </div>
          </div>
        </div>
      </s-section>

      {/* Last 7 days breakdown */}
      <s-section heading="Last 7 days — by widget">
        <div>
          {summary.length === 0 ? (
            <p style={{ opacity: 0.6, margin: 0 }}>
              No data yet. Widgets will log interactions once SmartRec is active on
              your storefront.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e1e3e5", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px 8px 0", fontWeight: 600 }}>Widget</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>
                    Triggered
                  </th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>
                    Clicked
                  </th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>
                    CTR
                  </th>
                  <th style={{ padding: "8px 0 8px 12px", fontWeight: 600, textAlign: "right" }}>
                    Conversions
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr
                    key={row.widgetType}
                    style={{ borderBottom: "1px solid #f1f2f3" }}
                  >
                    <td style={{ padding: "10px 12px 10px 0" }}>
                      {WIDGET_LABELS[row.widgetType] ?? row.widgetType}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {row.triggered}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {row.clicked}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {row.ctr}%
                    </td>
                    <td style={{ padding: "10px 0 10px 12px", textAlign: "right" }}>
                      {row.conversions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
