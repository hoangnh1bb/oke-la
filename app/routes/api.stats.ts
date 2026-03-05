import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { rateLimit } from "../middleware/rate-limit.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    // Rate limiting
    if (!rateLimit("stats", shop)) {
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Check if Growth plan
    const subscription = await db.subscription.findUnique({
      where: { shopId: shop },
    });

    if (!subscription || subscription.plan !== "growth") {
      return Response.json(
        { error: "Growth plan required" },
        { status: 403 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Widget usage stats
    const widgetStats = await db.$queryRaw<any[]>`
      SELECT 
        widgetType as widget_type,
        COUNT(*) as count
      FROM UsageLog
      WHERE shopId = ${shop}
        AND timestamp >= ${startDate}
      GROUP BY widgetType
      ORDER BY count DESC
    `;

    // Top products by add-to-cart
    const topProducts = await db.$queryRaw<any[]>`
      SELECT 
        productId as product_id,
        COUNT(*) as adds
      FROM UsageLog
      WHERE shopId = ${shop}
        AND eventType = 'add_to_cart'
        AND srSource = 1
        AND timestamp >= ${startDate}
        AND productId IS NOT NULL
      GROUP BY productId
      ORDER BY adds DESC
      LIMIT 10
    `;

    // 7-day trends
    const trends = await db.$queryRaw<any[]>`
      SELECT 
        DATE(timestamp) as day,
        COUNT(*) as count
      FROM UsageLog
      WHERE shopId = ${shop}
        AND timestamp >= datetime('now', '-7 days')
      GROUP BY day
      ORDER BY day
    `;

    // Revenue attribution (if Analytics Pro active)
    const hasAnalyticsPro = await db.addonSubscription.findFirst({
      where: {
        shopId: shop,
        addonType: "analytics_pro",
        status: "active",
      },
    });

    let revenueStats = null;
    if (hasAnalyticsPro) {
      const revenueData = await db.$queryRaw<any[]>`
        SELECT 
          SUM(attributedRevenue) as total_revenue,
          COUNT(*) as order_count,
          AVG(attributedRevenue) as avg_order_value
        FROM OrderAttribution
        WHERE shopId = ${shop}
          AND orderDate >= datetime('now', '-30 days')
      `;

      revenueStats = revenueData[0] || {
        total_revenue: 0,
        order_count: 0,
        avg_order_value: 0,
      };
    }

    return Response.json({
      widgetStats,
      topProducts,
      trends,
      revenueStats,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
