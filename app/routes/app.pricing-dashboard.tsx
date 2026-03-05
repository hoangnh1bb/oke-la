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
    <s-page heading="Chọn Gói Dịch Vụ">
      {/* Current Usage Banner */}
      {plan === "free" && (
        <s-banner tone={usageCount >= 450 ? "warning" : "info"} style={{ marginBottom: "24px" }}>
          <div>
            <p><strong>Sử dụng tháng này:</strong> {usageCount} / {limit} lượt tương tác ({percentage}%)</p>
            {usageCount >= 450 && (
              <p style={{ marginTop: "8px" }}>
                Bạn sắp đạt giới hạn. Nâng cấp lên Growth để không giới hạn!
              </p>
            )}
          </div>
        </s-banner>
      )}

      {plan === "growth" && (
        <s-banner tone="success" style={{ marginBottom: "24px" }}>
          <p>✅ <strong>Gói Growth đang hoạt động</strong> — Không giới hạn tương tác | {usageCount} lượt tháng này</p>
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
              GÓI HIỆN TẠI
            </div>
          )}
          
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600" }}>FREE</h2>
          <div style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px" }}>
            $0<span style={{ fontSize: "16px", fontWeight: "normal" }}>/tháng</span>
          </div>
          
          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            lineHeight: "1.8"
          }}>
            <li>✅ 500 lượt tương tác/tháng</li>
            <li>✅ Toàn bộ widget</li>
            <li>✅ Tùy chỉnh màu chính</li>
            <li>✅ Thống kê cơ bản</li>
            <li>⚠️ Giới hạn soft (banner cảnh báo)</li>
          </ul>

          {plan !== "free" ? (
            <s-button disabled fullWidth>Gói hiện tại</s-button>
          ) : (
            <s-button variant="secondary" fullWidth disabled>
              Đang sử dụng
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
              GÓI HIỆN TẠI
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
              PHỔ BIẾN NHẤT
            </div>
          )}
          
          <h2 style={{ fontSize: "24px", marginBottom: "8px", fontWeight: "600" }}>GROWTH</h2>
          <div style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px" }}>
            $11<span style={{ fontSize: "16px", fontWeight: "normal" }}>/tháng</span>
          </div>
          
          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            lineHeight: "1.8"
          }}>
            <li>✅ <strong>Không giới hạn</strong> tương tác</li>
            <li>✅ Dùng thử 7 ngày miễn phí</li>
            <li>✅ Dashboard thống kê</li>
            <li>✅ Top 10 sản phẩm</li>
            <li>✅ Tùy chỉnh giao diện</li>
            <li>✅ Hỗ trợ ưu tiên</li>
          </ul>

          {plan === "growth" ? (
            <s-button variant="secondary" fullWidth disabled>
              Đang sử dụng
            </s-button>
          ) : (
            <s-button variant="primary" fullWidth href="/app/billing/subscribe">
              Nâng cấp ngay
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
            $23<span style={{ fontSize: "16px", fontWeight: "normal" }}>/tháng</span>
          </div>
          
          <p style={{ 
            fontSize: "13px", 
            color: "#6d7175", 
            marginBottom: "16px",
            fontStyle: "italic"
          }}>
            Growth + 2 Add-ons
          </p>

          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            marginBottom: "24px",
            lineHeight: "1.8"
          }}>
            <li>✅ <strong>Tất cả tính năng Growth</strong></li>
            <li style={{ marginTop: "8px", paddingLeft: "16px", borderLeft: "3px solid #5C6AC4" }}>
              <strong>+ Giao Diện Pro ($5)</strong>
              <ul style={{ fontSize: "14px", color: "#6d7175", marginTop: "4px" }}>
                <li>→ Màu riêng cho từng widget</li>
                <li>→ Style nút tùy chỉnh</li>
                <li>→ Text tùy chỉnh</li>
              </ul>
            </li>
            <li style={{ marginTop: "8px", paddingLeft: "16px", borderLeft: "3px solid #5C6AC4" }}>
              <strong>+ Thống Kê Pro ($7)</strong>
              <ul style={{ fontSize: "14px", color: "#6d7175", marginTop: "4px" }}>
                <li>→ Phân tích doanh thu</li>
                <li>→ Biểu đồ xu hướng 7 ngày</li>
                <li>→ Theo dõi đơn hàng</li>
              </ul>
            </li>
          </ul>

          {plan === "growth" && !hasAppearancePro && !hasAnalyticsPro ? (
            <s-button variant="primary" fullWidth href="/app/billing/addon">
              Mua Add-ons
            </s-button>
          ) : plan !== "growth" ? (
            <s-button variant="secondary" fullWidth disabled>
              Cần gói Growth
            </s-button>
          ) : (
            <s-button variant="secondary" fullWidth disabled>
              Đã kích hoạt
            </s-button>
          )}
        </div>
      </div>

      {/* Add-ons Detail (for Growth users) */}
      {plan === "growth" && (
        <s-section heading="Mua Add-ons Riêng Lẻ">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            
            <div style={{
              border: "1px solid #dfe3e8",
              borderRadius: "8px",
              padding: "20px",
              background: hasAppearancePro ? "#f4f6f8" : "white"
            }}>
              <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>🎨 Giao Diện Pro</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px" }}>$5/tháng</p>
              <ul style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
                <li>Màu riêng cho từng widget</li>
                <li>Style nút (solid/outline)</li>
                <li>Text tùy chỉnh</li>
                <li>Live preview</li>
              </ul>
              {hasAppearancePro ? (
                <>
                  <s-button variant="secondary" fullWidth disabled>Đã kích hoạt</s-button>
                  <s-button variant="plain" fullWidth href="/app/settings/appearance-pro" style={{ marginTop: "8px" }}>
                    Cài đặt →
                  </s-button>
                </>
              ) : (
                <s-button variant="primary" fullWidth href="/app/billing/addon?addon=appearance_pro">
                  Mua ngay
                </s-button>
              )}
            </div>

            <div style={{
              border: "1px solid #dfe3e8",
              borderRadius: "8px",
              padding: "20px",
              background: hasAnalyticsPro ? "#f4f6f8" : "white"
            }}>
              <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>📊 Thống Kê Pro</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px" }}>$7/tháng</p>
              <ul style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
                <li>Phân tích doanh thu chi tiết</li>
                <li>Biểu đồ xu hướng 7 ngày</li>
                <li>Top sản phẩm theo tương tác</li>
                <li>Theo dõi đơn hàng</li>
              </ul>
              {hasAnalyticsPro ? (
                <>
                  <s-button variant="secondary" fullWidth disabled>Đã kích hoạt</s-button>
                  <s-button variant="plain" fullWidth href="/app/analytics-pro" style={{ marginTop: "8px" }}>
                    Xem dashboard →
                  </s-button>
                </>
              ) : (
                <s-button variant="primary" fullWidth href="/app/billing/addon?addon=analytics_pro">
                  Mua ngay
                </s-button>
              )}
            </div>
          </div>
        </s-section>
      )}

      {/* FAQ Section */}
      <s-section heading="❓ Câu hỏi thường gặp">
        <div style={{ fontSize: "14px", lineHeight: "1.8" }}>
          <p><strong>Q: Có thể hủy gói bất cứ lúc nào không?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Có, bạn có thể hủy bất cứ lúc nào trong Shopify Admin. Không tính phí khi hủy.
          </p>

          <p><strong>Q: Dùng thử 7 ngày có tính phí không?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Không, 7 ngày đầu hoàn toàn miễn phí. Bạn có thể hủy trước khi kết thúc thời gian thử.
          </p>

          <p><strong>Q: Gói FREE có bị chặn khi vượt 500 lượt không?</strong></p>
          <p style={{ color: "#6d7175", marginBottom: "16px" }}>
            A: Không, chỉ hiện banner cảnh báo. Widget vẫn hoạt động bình thường.
          </p>

          <p><strong>Q: Add-on có thể mua riêng không cần Growth?</strong></p>
          <p style={{ color: "#6d7175" }}>
            A: Không, add-ons yêu cầu gói Growth đang hoạt động.
          </p>
        </div>
      </s-section>
    </s-page>
  );
}
