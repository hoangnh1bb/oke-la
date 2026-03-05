import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type LoaderData =
  | { error: string; data: null }
  | {
      error: null;
      data: {
        dailyUsage: Array<{ day: string; count: number }>;
        topProducts: Array<{ productId: string | null; count: number }>;
        revenue: { total: number; orderCount: number; avgOrderValue: number };
      };
    };

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const addon = await db.addonSubscription.findFirst({
    where: { shopId: shop, addonType: "analytics_pro", status: "active" },
  });

  if (!addon) {
    return Response.json({ error: "Analytics Pro required", data: null }, { status: 403 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dailyUsage = await db.$queryRaw<Array<{ day: string; count: number }>>`
    SELECT DATE(timestamp) as day, COUNT(*) as count
    FROM UsageLog
    WHERE shopId = ${shop} AND timestamp >= ${sevenDaysAgo.toISOString()}
    GROUP BY DATE(timestamp)
    ORDER BY day ASC
  `;

  const topProducts = await db.usageLog.groupBy({
    by: ["productId"],
    where: {
      shopId: shop,
      eventType: "add_to_cart",
      srSource: true,
      productId: { not: null },
      timestamp: { gte: sevenDaysAgo },
    },
    _count: true,
    orderBy: { _count: { productId: "desc" } },
    take: 10,
  });

  const attributedOrders = await db.orderAttribution.findMany({
    where: { shopId: shop, createdAt: { gte: sevenDaysAgo } },
    select: { orderTotal: true, productIds: true },
  });

  const totalRevenue = attributedOrders.reduce((sum: number, order: { orderTotal: number }) => sum + order.orderTotal, 0);
  const orderCount = attributedOrders.length;

  return Response.json({
    error: null,
    data: {
      dailyUsage,
      topProducts: topProducts.map((p: { productId: string | null; _count: number }) => ({ productId: p.productId, count: p._count })),
      revenue: {
        total: totalRevenue,
        orderCount,
        avgOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      },
    },
  });
}

export default function AnalyticsPro() {
  const loaderData = useLoaderData<LoaderData>();
  const { error } = loaderData;

  if (error) {
    return (
      <s-page heading="Analytics Pro">
        <s-section>
          <p style={{ color: "red" }}>{error}</p>
        </s-section>
      </s-page>
    );
  }

  const data = loaderData.data!;

  return (
    <s-page heading="Analytics Pro">
      <s-section heading="Revenue Attribution (Last 7 Days)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div>
            <p style={{ color: "#6d7175" }}>Total Revenue</p>
            <p style={{ fontSize: "20px", fontWeight: "bold" }}>${data.revenue.total.toFixed(2)}</p>
          </div>
          <div>
            <p style={{ color: "#6d7175" }}>Orders</p>
            <p style={{ fontSize: "20px", fontWeight: "bold" }}>{data.revenue.orderCount}</p>
          </div>
          <div>
            <p style={{ color: "#6d7175" }}>Avg Order Value</p>
            <p style={{ fontSize: "20px", fontWeight: "bold" }}>${data.revenue.avgOrderValue.toFixed(2)}</p>
          </div>
        </div>
      </s-section>

      <s-section heading="Top Products Added (Last 7 Days)">
        {data.topProducts.length === 0 ? (
          <p>No data yet. Products added via widgets will appear here.</p>
        ) : (
          <div>
            {data.topProducts.map((product: { productId: string | null; count: number }, index: number) => (
              <div key={product.productId} style={{ padding: "8px 0", borderBottom: "1px solid #e1e3e5" }}>
                <p>#{index + 1} Product ID: {product.productId} — {product.count} adds</p>
              </div>
            ))}
          </div>
        )}
      </s-section>

      <s-section heading="Daily Interaction Trend (Last 7 Days)">
        {data.dailyUsage.length === 0 ? (
          <p>No interaction data yet.</p>
        ) : (
          <div>
            {data.dailyUsage.map((day: { day: string; count: number }) => (
              <div key={day.day} style={{ padding: "8px 0" }}>
                <p>{day.day}: {day.count} interactions</p>
              </div>
            ))}
          </div>
        )}
      </s-section>
    </s-page>
  );
}
