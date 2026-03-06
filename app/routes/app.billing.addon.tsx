import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Form, redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { createCharge } from "../lib/billing.server";
import db from "../db.server";

type LoaderData = {
  plan: string;
  hasAppearancePro: boolean;
  hasAnalyticsPro: boolean;
  preselectedAddon: string | null;
};

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const preselectedAddon = url.searchParams.get("addon");

  const subscription = await db.subscription.findUnique({ where: { shopId: shop } });
  const addons = await db.addonSubscription.findMany({ where: { shopId: shop, status: "active" } });

  return Response.json({
    plan: subscription?.plan || "free",
    hasAppearancePro: addons.some((a: { addonType: string }) => a.addonType === "appearance_pro"),
    hasAnalyticsPro: addons.some((a: { addonType: string }) => a.addonType === "analytics_pro"),
    preselectedAddon: preselectedAddon && ["appearance_pro", "analytics_pro"].includes(preselectedAddon) 
      ? preselectedAddon 
      : null,
  });
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const addonType = formData.get("addon")?.toString() as "appearance_pro" | "analytics_pro";

  if (!addonType || !["appearance_pro", "analytics_pro"].includes(addonType)) {
    return Response.json({ error: "Invalid add-on type" }, { status: 400 });
  }

  try {
    const result = await createCharge({
      shop,
      plan: addonType,
      returnUrl: `https://${shop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE}/app/pricing-dashboard`,
      billing,
    });

    if (!result.success || !result.confirmationUrl) {
      throw new Error(result.error || "Failed to create charge");
    }

    await db.addonSubscription.create({
      data: { shopId: shop, addonType, status: "pending" },
    });

    return redirect(result.confirmationUrl);
  } catch (error) {
    console.error("Add-on purchase error:", error);
    return Response.json({ error: "Failed to purchase add-on" }, { status: 500 });
  }
}

export default function AddonPurchase() {
  const { plan, hasAppearancePro, hasAnalyticsPro, preselectedAddon } = useLoaderData<LoaderData>();

  return (
    <s-page heading="Choose Add-ons">
      {/* Info Banner - UPDATED: Remove Growth requirement warning */}
      <s-banner tone="info" style={{ marginBottom: "32px" }}>
        <p>
          <strong>📦 Add-ons can be purchased with any plan (FREE or GROWTH)</strong>
          <br />
          {plan === "free" && (
            <span style={{ fontSize: "14px", color: "#6d7175" }}>
              💡 Note: Add-ons do not increase the 500 interaction limit. Upgrade to GROWTH for unlimited.
            </span>
          )}
        </p>
      </s-banner>

      {/* Add-ons Pricing Table */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "24px",
        marginBottom: "40px"
      }}>
        
        {/* Appearance Pro */}
        <div style={{
          border: hasAppearancePro 
            ? "2px solid #50C878" 
            : preselectedAddon === "appearance_pro" 
              ? "2px solid #5C6AC4" 
              : "1px solid #dfe3e8",
          borderRadius: "12px",
          padding: "32px",
          background: hasAppearancePro ? "#f4f6f8" : "white",
          position: "relative",
          boxShadow: preselectedAddon === "appearance_pro" ? "0 4px 12px rgba(92, 106, 196, 0.2)" : "none"
        }}>
          {hasAppearancePro && (
            <div style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#50C878",
              color: "white",
              padding: "4px 16px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              ✓ ACTIVATED
            </div>
          )}
          
          {!hasAppearancePro && preselectedAddon === "appearance_pro" && (
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
              SELECTED
            </div>
          )}
          
          <div style={{ fontSize: "48px", marginBottom: "12px", textAlign: "center" }}>🎨</div>
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600", textAlign: "center" }}>
            Appearance Pro
          </h2>
          <div style={{ 
            fontSize: "36px", 
            fontWeight: "bold", 
            marginBottom: "20px",
            textAlign: "center",
            color: "#202223"
          }}>
            $5<span style={{ fontSize: "16px", fontWeight: "normal", color: "#6d7175" }}>/month</span>
          </div>

          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            fontSize: "14px",
            lineHeight: "1.8"
          }}>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Per-widget colors
            </li>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Button styles (solid/outline)
            </li>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Detailed text customization
            </li>
            <li style={{ padding: "8px 0" }}>
              ✅ Live preview in admin
            </li>
          </ul>

          <div style={{ 
            background: "#f9fafb", 
            padding: "12px", 
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#6d7175"
          }}>
            <strong>Best for:</strong>
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Shops needing consistent branding</li>
              <li>Theme-based appearance customization</li>
              <li>A/B testing colors & text</li>
            </ul>
          </div>

          {hasAppearancePro ? (
            <>
              <s-button variant="secondary" fullWidth disabled>
                ✓ Activated
              </s-button>
              <s-button variant="plain" fullWidth href="/app/settings/appearance-pro" style={{ marginTop: "8px" }}>
                Open settings →
              </s-button>
            </>
          ) : (
            <Form method="post">
              <input type="hidden" name="addon" value="appearance_pro" />
              <s-button variant="primary" type="submit" fullWidth>
                Buy now $5/month
              </s-button>
            </Form>
          )}
        </div>

        {/* Analytics Pro */}
        <div style={{
          border: hasAnalyticsPro 
            ? "2px solid #50C878" 
            : preselectedAddon === "analytics_pro" 
              ? "2px solid #5C6AC4" 
              : "1px solid #dfe3e8",
          borderRadius: "12px",
          padding: "32px",
          background: hasAnalyticsPro ? "#f4f6f8" : "white",
          position: "relative",
          boxShadow: preselectedAddon === "analytics_pro" ? "0 4px 12px rgba(92, 106, 196, 0.2)" : "none"
        }}>
          {hasAnalyticsPro && (
            <div style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#50C878",
              color: "white",
              padding: "4px 16px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              ✓ ACTIVATED
            </div>
          )}
          
          {!hasAnalyticsPro && preselectedAddon === "analytics_pro" && (
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
              SELECTED
            </div>
          )}
          
          <div style={{ fontSize: "48px", marginBottom: "12px", textAlign: "center" }}>📊</div>
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600", textAlign: "center" }}>
            Analytics Pro
          </h2>
          <div style={{ 
            fontSize: "36px", 
            fontWeight: "bold", 
            marginBottom: "20px",
            textAlign: "center",
            color: "#202223"
          }}>
            $7<span style={{ fontSize: "16px", fontWeight: "normal", color: "#6d7175" }}>/month</span>
          </div>

          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            fontSize: "14px",
            lineHeight: "1.8"
          }}>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Detailed revenue analysis
            </li>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ 7-day trend charts
            </li>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Top products by interactions
            </li>
            <li style={{ padding: "8px 0" }}>
              ✅ Order tracking (24h window)
            </li>
          </ul>

          <div style={{ 
            background: "#f9fafb", 
            padding: "12px", 
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#6d7175"
          }}>
            <strong>Best for:</strong>
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Shops needing to measure app ROI</li>
              <li>Optimize product placement</li>
              <li>Data-driven decisions</li>
            </ul>
          </div>

          {hasAnalyticsPro ? (
            <>
              <s-button variant="secondary" fullWidth disabled>
                ✓ Activated
              </s-button>
              <s-button variant="plain" fullWidth href="/app/analytics-pro" style={{ marginTop: "8px" }}>
                View dashboard →
              </s-button>
            </>
          ) : (
            <Form method="post">
              <input type="hidden" name="addon" value="analytics_pro" />
              <s-button variant="primary" type="submit" fullWidth>
                Buy now $7/month
              </s-button>
            </Form>
          )}
        </div>
      </div>

      {/* Bundle Offer - UPDATED with discount */}
      {!hasAppearancePro && !hasAnalyticsPro && plan === "growth" && (
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "32px",
          textAlign: "center"
        }}>
          <h3 style={{ fontSize: "20px", marginBottom: "12px", fontWeight: "600" }}>
            💎 PRO Bundle (Better Value)
          </h3>
          <p style={{ fontSize: "16px", marginBottom: "16px", opacity: "0.9" }}>
            Using GROWTH + want both add-ons?
          </p>
          <p style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            $20<span style={{ fontSize: "18px", fontWeight: "normal" }}>/month</span>
          </p>
          <p style={{ fontSize: "16px", marginBottom: "20px", opacity: "0.9" }}>
            Instead of $23/month separately • <strong>Save $3/month</strong>
          </p>
          <p style={{ fontSize: "13px", opacity: "0.8", marginBottom: "16px" }}>
            (GROWTH $11 + Appearance Pro $5 + Analytics Pro $7 = $23)<br />
            PRO Bundle only $20 → Save $3/mo
          </p>
          <s-button href="/app/pricing-dashboard" style={{ background: "white", color: "#667eea" }}>
            View PRO plan →
          </s-button>
        </div>
      )}

      {/* Comparison Table */}
      <s-section heading="Compare Add-ons">
        <div style={{ overflowX: "auto" }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            fontSize: "14px"
          }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dfe3e8" }}>
                  Feature
                </th>
                <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dfe3e8" }}>
                  🎨 Appearance Pro
                </th>
                <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dfe3e8" }}>
                  📊 Analytics Pro
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  Requires GROWTH plan
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#6d7175", fontSize: "14px" }}>No</span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#6d7175", fontSize: "14px" }}>No</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  Per-widget color customization
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#50C878", fontSize: "18px" }}>✓</span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#dfe3e8", fontSize: "18px" }}>—</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  Button styles (solid/outline)
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#50C878", fontSize: "18px" }}>✓</span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#dfe3e8", fontSize: "18px" }}>—</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  Text customization
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#50C878", fontSize: "18px" }}>✓</span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#dfe3e8", fontSize: "18px" }}>—</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  Live preview
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#50C878", fontSize: "18px" }}>✓</span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#dfe3e8", fontSize: "18px" }}>—</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  Revenue attribution
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#dfe3e8", fontSize: "18px" }}>—</span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#50C878", fontSize: "18px" }}>✓</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  Top products chart
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#dfe3e8", fontSize: "18px" }}>—</span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#50C878", fontSize: "18px" }}>✓</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  7-day trend analysis
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#dfe3e8", fontSize: "18px" }}>—</span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #f4f6f8" }}>
                  <span style={{ color: "#50C878", fontSize: "18px" }}>✓</span>
                </td>
              </tr>
              <tr style={{ background: "#f9fafb", fontWeight: "600" }}>
                <td style={{ padding: "12px", borderBottom: "2px solid #dfe3e8" }}>
                  Price/month
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dfe3e8", color: "#5C6AC4" }}>
                  $5
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dfe3e8", color: "#5C6AC4" }}>
                  $7
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </s-section>

      {/* FAQ - UPDATED */}
      <s-section heading="❓ Frequently Asked Questions">
        <div style={{ fontSize: "14px", lineHeight: "1.8" }}>
          <p><strong>Q: Can FREE plan purchase add-ons?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Yes! Add-ons don't require the GROWTH plan. However, the 500 interaction limit still applies.
          </p>

          <p><strong>Q: Do add-ons give FREE plan unlimited interactions?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: No, add-ons only extend features. Upgrade to GROWTH for unlimited interactions.
          </p>

          <p><strong>Q: What is the PRO bundle?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: PRO = GROWTH + both add-ons for $20/month (save $3 vs buying separately).
          </p>

          <p><strong>Q: Can I buy one add-on now and another later?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Yes, add-ons are independent. Purchase anytime.
          </p>

          <p><strong>Q: When will the PRO bundle be available?</strong></p>
          <p style={{ color: "#6d7175" }}>
            A: Bundle purchase flow coming soon. Buy GROWTH + both add-ons separately = $23/mo. Bundle $20 will be available later.
          </p>
        </div>
      </s-section>

      {/* Back Button */}
      <div style={{ textAlign: "center", marginTop: "32px", paddingTop: "24px", borderTop: "1px solid #dfe3e8" }}>
        <s-button href="/app/pricing-dashboard">
          ← Back to pricing
        </s-button>
      </div>
    </s-page>
  );
}
