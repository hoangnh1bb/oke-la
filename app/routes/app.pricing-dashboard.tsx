import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type LoaderData = {
  plan: string;
  usageCount: number;
  limit: number | null;
  percentage: number;
  hasAppearancePro: boolean;
  hasAnalyticsPro: boolean;
};

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const subscription = await db.subscription.findUnique({ where: { shopId: shop } });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageCount = await db.usageLog.count({
    where: { shopId: shop, timestamp: { gte: startOfMonth } },
  });

  const addons = await db.addonSubscription.findMany({
    where: { shopId: shop, status: "active" },
  });

  const plan = subscription?.plan || "free";
  const limit = plan === "free" ? 500 : null;

  return Response.json({
    plan,
    usageCount,
    limit,
    percentage: limit ? Math.round((usageCount / limit) * 100) : 0,
    hasAppearancePro: addons.some(a => a.addonType === "appearance_pro"),
    hasAnalyticsPro: addons.some(a => a.addonType === "analytics_pro"),
  });
}

export default function PricingDashboard() {
  const { plan, usageCount, limit, percentage, hasAppearancePro, hasAnalyticsPro } = useLoaderData<LoaderData>();

  return (
    <s-page heading="Choose Your Plan">
      {/* Current Usage Banner */}
      {plan === "free" && (
        <s-banner tone={usageCount >= 450 ? "warning" : "info"} style={{ marginBottom: "24px" }}>
          <div>
            <p><strong>Usage this month:</strong> {usageCount} / {limit} interactions ({percentage}%)</p>
            {usageCount >= 450 && (
              <p style={{ marginTop: "8px" }}>
                You are approaching your limit. Upgrade to Growth for unlimited interactions!
              </p>
            )}
          </div>
        </s-banner>
      )}

      {plan === "growth" && (
        <s-banner tone="success" style={{ marginBottom: "24px" }}>
          <p>✅ <strong>Growth plan is active</strong> — Unlimited interactions | {usageCount} interactions this month</p>
        </s-banner>
      )}

      {/* Pricing Table */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
        marginBottom: "32px"
      }}>
        
        {/* FREE Tier */}
        <div style={{
          border: plan === "free" ? "2px solid #5C6AC4" : "1px solid #dfe3e8",
          borderRadius: "12px",
          padding: "24px",
          background: plan === "free" ? "#f4f6f8" : "white",
          position: "relative"
        }}>
          {plan === "free" && (
            <div style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#5C6AC4",
              color: "white",
              padding: "4px 16px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              CURRENT PLAN
            </div>
          )}
          
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600" }}>FREE</h2>
          <div style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px" }}>
            $0<span style={{ fontSize: "16px", fontWeight: "normal" }}>/month</span>
          </div>
          
          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            lineHeight: "1.8"
          }}>
            <li>✅ 500 interactions/month</li>
            <li>✅ All widgets</li>
            <li>✅ Primary color customization</li>
            <li>✅ Basic analytics</li>
            <li>⚠️ Soft limit (banner warning)</li>
          </ul>

          {plan !== "free" ? (
            <s-button disabled fullWidth>Current plan</s-button>
          ) : (
            <s-button variant="secondary" fullWidth disabled>
              Currently using
            </s-button>
          )}
        </div>

        {/* GROWTH Tier */}
        <div style={{
          border: plan === "growth" ? "2px solid #5C6AC4" : "2px solid #5C6AC4",
          borderRadius: "12px",
          padding: "24px",
          background: plan === "growth" ? "#f4f6f8" : "white",
          position: "relative",
          boxShadow: "0 4px 12px rgba(92, 106, 196, 0.15)"
        }}>
          {plan === "growth" && (
            <div style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#5C6AC4",
              color: "white",
              padding: "4px 16px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              CURRENT PLAN
            </div>
          )}

          {plan !== "growth" && (
            <div style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#FFD700",
              color: "#000",
              padding: "4px 16px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              MOST POPULAR
            </div>
          )}
          
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600" }}>GROWTH</h2>
          <div style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px" }}>
            $11<span style={{ fontSize: "16px", fontWeight: "normal" }}>/month</span>
          </div>
          
          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            lineHeight: "1.8"
          }}>
            <li>✅ <strong>Không giới hạn</strong> tương tác</li>
            <li>✅ Dùng thử 7 ngày miễn phí</li>
            <li>✅ Analytics dashboard</li>
            <li>✅ Top 10 products</li>
            <li>✅ Appearance customization</li>
            <li>✅ Priority support</li>
          </ul>

          {plan === "growth" ? (
            <s-button variant="secondary" fullWidth disabled>
              Currently using
            </s-button>
          ) : (
            <s-button variant="primary" fullWidth href="/app/billing/subscribe">
              Upgrade now
            </s-button>
          )}
        </div>

        {/* PRO (Add-ons Bundle) */}
        <div style={{
          border: "1px solid #dfe3e8",
          borderRadius: "12px",
          padding: "24px",
          background: "white",
          position: "relative"
        }}>
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600" }}>PRO</h2>
          <div style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px" }}>
            $20<span style={{ fontSize: "16px", fontWeight: "normal" }}>/month</span>
          </div>
          
          <p style={{ 
            fontSize: "13px", 
            color: "#6d7175", 
            marginBottom: "16px",
            fontStyle: "italic"
          }}>
            Growth + 2 Add-ons • Save $3/month (vs $11+$5+$7=$23)
          </p>

          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            lineHeight: "1.8"
          }}>
            <li>✅ <strong>All Growth features</strong></li>
            <li style={{ marginTop: "8px", paddingLeft: "16px", borderLeft: "3px solid #5C6AC4" }}>
              <strong>+ Appearance Pro ($5)</strong>
              <ul style={{ fontSize: "14px", color: "#6d7175", marginTop: "4px" }}>
                <li>→ Per-widget colors</li>
                <li>→ Custom button styles</li>
                <li>→ Custom text</li>
              </ul>
            </li>
            <li style={{ marginTop: "8px", paddingLeft: "16px", borderLeft: "3px solid #5C6AC4" }}>
              <strong>+ Analytics Pro ($7)</strong>
              <ul style={{ fontSize: "14px", color: "#6d7175", marginTop: "4px" }}>
                <li>→ Revenue analysis</li>
                <li>→ 7-day trend charts</li>
                <li>→ Order tracking</li>
              </ul>
            </li>
          </ul>

          {plan === "growth" && !hasAppearancePro && !hasAnalyticsPro ? (
            <s-button variant="primary" fullWidth href="/app/billing/addon">
              Mua Add-ons
            </s-button>
          ) : plan !== "growth" ? (
            <s-button variant="secondary" fullWidth disabled>
              Requires Growth
            </s-button>
          ) : (
            <s-button variant="secondary" fullWidth disabled>
              Activated
            </s-button>
          )}
        </div>
      </div>

      {/* Add-ons Detail (for Growth users) */}
      {true && (
        <s-section heading="Buy Add-ons Individually">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            
            <div style={{
              border: "1px solid #dfe3e8",
              borderRadius: "8px",
              padding: "20px",
              background: hasAppearancePro ? "#f4f6f8" : "white"
            }}>
              <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>🎨 Appearance Pro</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px" }}>$5/month</p>
              <ul style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
                <li>Per-widget colors</li>
                <li>Style nút (solid/outline)</li>
                <li>Custom text</li>
                <li>Live preview</li>
              </ul>
              {hasAppearancePro ? (
                <>
                  <s-button variant="secondary" fullWidth disabled>Activated</s-button>
                  <s-button variant="plain" fullWidth href="/app/settings/appearance-pro" style={{ marginTop: "8px" }}>
                    Settings →
                  </s-button>
                </>
              ) : (
                <s-button variant="primary" fullWidth href="/app/billing/addon?addon=appearance_pro">
                  Buy now
                </s-button>
              )}
            </div>

            <div style={{
              border: "1px solid #dfe3e8",
              borderRadius: "8px",
              padding: "20px",
              background: hasAnalyticsPro ? "#f4f6f8" : "white"
            }}>
              <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>📊 Analytics Pro</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px" }}>$7/month</p>
              <ul style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
                <li>Revenue analysis chi tiết</li>
                <li>7-day trend charts</li>
                <li>Top sản phẩm theo tương tác</li>
                <li>Order tracking</li>
              </ul>
              {hasAnalyticsPro ? (
                <>
                  <s-button variant="secondary" fullWidth disabled>Activated</s-button>
                  <s-button variant="plain" fullWidth href="/app/analytics-pro" style={{ marginTop: "8px" }}>
                    View dashboard →
                  </s-button>
                </>
              ) : (
                <s-button variant="primary" fullWidth href="/app/billing/addon?addon=analytics_pro">
                  Buy now
                </s-button>
              )}
            </div>
          </div>
        </s-section>
      )}

      {/* FAQ Section */}
      <s-section heading="❓ Frequently Asked Questions">
        <div style={{ fontSize: "14px", lineHeight: "1.8" }}>
          <p><strong>Q: Can I cancel my plan anytime?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Yes, you can cancel anytime in Shopify Admin. No cancellation fees.
          </p>

          <p><strong>Q: Is the 7-day trial free?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: No, the first 7 days are completely free. You can cancel before trial ends.
          </p>

          <p><strong>Q: Will FREE plan be blocked after 500 interactions?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: No, only a warning banner is shown. Widgets continue to work normally.
          </p>

          <p><strong>Q: Can I buy add-ons without Growth?</strong></p>
          <p style={{ color: "#6d7175" }}>
            A: Yes! FREE plan can purchase add-ons. However, the 500 interaction limit still applies.
          </p>
        </div>
      </s-section>
    </s-page>
  );
}
