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

  if (plan === "free") {
    return (
      <s-page heading="Add-ons">
        <s-banner tone="warning" style={{ marginBottom: "24px" }}>
          <div>
            <p style={{ marginBottom: "8px" }}>
              <strong>⚠️ Add-ons yêu cầu gói Growth</strong>
            </p>
            <p style={{ fontSize: "14px" }}>
              Vui lòng nâng cấp lên gói Growth ($11/tháng) để mua add-ons.
            </p>
          </div>
        </s-banner>
        
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <s-button variant="primary" href="/app/billing/subscribe" style={{ marginRight: "12px" }}>
            Nâng cấp lên Growth
          </s-button>
          <s-button href="/app/pricing-dashboard">
            Quay lại bảng giá
          </s-button>
        </div>
      </s-page>
    );
  }

  return (
    <s-page heading="Chọn Add-ons">
      {/* Info Banner */}
      <s-banner tone="info" style={{ marginBottom: "32px" }}>
        <p>
          <strong>📦 Add-ons nâng cao tính năng của gói Growth</strong>
          <br />
          Chọn add-on phù hợp với nhu cầu của bạn. Có thể mua riêng lẻ hoặc cả hai.
        </p>
      </s-banner>

      {/* Add-ons Pricing Table */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "24px",
        marginBottom: "40px"
      }}>
        
        {/* Giao Diện Pro */}
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
              ✓ ĐÃ KÍCH HOẠT
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
              ĐƯỢC CHỌN
            </div>
          )}
          
          <div style={{ fontSize: "48px", marginBottom: "12px", textAlign: "center" }}>🎨</div>
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600", textAlign: "center" }}>
            Giao Diện Pro
          </h2>
          <div style={{ 
            fontSize: "36px", 
            fontWeight: "bold", 
            marginBottom: "20px",
            textAlign: "center",
            color: "#202223"
          }}>
            $5<span style={{ fontSize: "16px", fontWeight: "normal", color: "#6d7175" }}>/tháng</span>
          </div>

          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            fontSize: "14px",
            lineHeight: "1.8"
          }}>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Màu riêng cho từng widget
            </li>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Style nút (solid/outline)
            </li>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Text tùy chỉnh chi tiết
            </li>
            <li style={{ padding: "8px 0" }}>
              ✅ Live preview trong admin
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
            <strong>Phù hợp cho:</strong>
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Shops cần branding nhất quán</li>
              <li>Tùy chỉnh giao diện theo theme</li>
              <li>A/B testing màu & text</li>
            </ul>
          </div>

          {hasAppearancePro ? (
            <>
              <s-button variant="secondary" fullWidth disabled>
                ✓ Đã kích hoạt
              </s-button>
              <s-button variant="plain" fullWidth href="/app/settings/appearance-pro" style={{ marginTop: "8px" }}>
                Mở cài đặt →
              </s-button>
            </>
          ) : (
            <Form method="post">
              <input type="hidden" name="addon" value="appearance_pro" />
              <s-button variant="primary" type="submit" fullWidth>
                Mua ngay $5/tháng
              </s-button>
            </Form>
          )}
        </div>

        {/* Thống Kê Pro */}
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
              ✓ ĐÃ KÍCH HOẠT
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
              ĐƯỢC CHỌN
            </div>
          )}
          
          <div style={{ fontSize: "48px", marginBottom: "12px", textAlign: "center" }}>📊</div>
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600", textAlign: "center" }}>
            Thống Kê Pro
          </h2>
          <div style={{ 
            fontSize: "36px", 
            fontWeight: "bold", 
            marginBottom: "20px",
            textAlign: "center",
            color: "#202223"
          }}>
            $7<span style={{ fontSize: "16px", fontWeight: "normal", color: "#6d7175" }}>/tháng</span>
          </div>

          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            fontSize: "14px",
            lineHeight: "1.8"
          }}>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Phân tích doanh thu chi tiết
            </li>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Biểu đồ xu hướng 7 ngày
            </li>
            <li style={{ padding: "8px 0", borderBottom: "1px solid #f4f6f8" }}>
              ✅ Top sản phẩm theo tương tác
            </li>
            <li style={{ padding: "8px 0" }}>
              ✅ Theo dõi đơn hàng (24h window)
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
            <strong>Phù hợp cho:</strong>
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Shops cần đo ROI của app</li>
              <li>Tối ưu product placement</li>
              <li>Data-driven decisions</li>
            </ul>
          </div>

          {hasAnalyticsPro ? (
            <>
              <s-button variant="secondary" fullWidth disabled>
                ✓ Đã kích hoạt
              </s-button>
              <s-button variant="plain" fullWidth href="/app/analytics-pro" style={{ marginTop: "8px" }}>
                Xem dashboard →
              </s-button>
            </>
          ) : (
            <Form method="post">
              <input type="hidden" name="addon" value="analytics_pro" />
              <s-button variant="primary" type="submit" fullWidth>
                Mua ngay $7/tháng
              </s-button>
            </Form>
          )}
        </div>
      </div>

      {/* Bundle Offer (if neither active) */}
      {!hasAppearancePro && !hasAnalyticsPro && (
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "32px",
          textAlign: "center"
        }}>
          <h3 style={{ fontSize: "20px", marginBottom: "12px", fontWeight: "600" }}>
            💎 Bundle Deal
          </h3>
          <p style={{ fontSize: "16px", marginBottom: "16px", opacity: "0.9" }}>
            Mua cả 2 add-ons chỉ với <strong>$12/tháng</strong> thay vì $5 + $7
          </p>
          <p style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            $12<span style={{ fontSize: "18px", fontWeight: "normal" }}>/tháng</span>
          </p>
          <p style={{ fontSize: "14px", opacity: "0.8", marginBottom: "20px" }}>
            Tiết kiệm $0/tháng (chương trình khuyến mãi sắp tới)
          </p>
          <div style={{ fontSize: "13px", opacity: "0.9", fontStyle: "italic" }}>
            * Hiện tại chưa có bundle discount. Mua riêng lẻ: $5 + $7 = $12/tháng
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <s-section heading="So sánh Add-ons">
        <div style={{ overflowX: "auto" }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            fontSize: "14px"
          }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dfe3e8" }}>
                  Tính năng
                </th>
                <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dfe3e8" }}>
                  🎨 Giao Diện Pro
                </th>
                <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dfe3e8" }}>
                  📊 Thống Kê Pro
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "12px", borderBottom: "1px solid #f4f6f8" }}>
                  Màu tùy chỉnh per-widget
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
                  Style nút (solid/outline)
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
                  Text tùy chỉnh
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
                  Giá/tháng
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

      {/* FAQ */}
      <s-section heading="❓ Câu hỏi thường gặp">
        <div style={{ fontSize: "14px", lineHeight: "1.8" }}>
          <p><strong>Q: Có thể mua 1 add-on rồi mua thêm add-on kia sau không?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Có, add-ons độc lập với nhau. Mua lúc nào cũng được.
          </p>

          <p><strong>Q: Có thể hủy add-on mà giữ gói Growth không?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Có, add-ons riêng biệt với Growth. Hủy add-on không ảnh hưởng gói chính.
          </p>

          <p><strong>Q: Add-on có thời gian dùng thử không?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Không, add-ons không có trial. Nhưng có thể hủy bất cứ lúc nào.
          </p>

          <p><strong>Q: Bundle deal khi nào có?</strong></p>
          <p style={{ color: "#6d7175" }}>
            A: Chương trình khuyến mãi bundle sẽ có trong tương lai. Theo dõi email để cập nhật.
          </p>
        </div>
      </s-section>

      {/* Back Button */}
      <div style={{ textAlign: "center", marginTop: "32px", paddingTop: "24px", borderTop: "1px solid #dfe3e8" }}>
        <s-button href="/app/pricing-dashboard">
          ← Quay lại bảng giá
        </s-button>
      </div>
    </s-page>
  );
}
