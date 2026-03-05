import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";
import db from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Check add-on access
  const addon = await db.addonSubscription.findFirst({
    where: { shopId: shop, addonType: "analytics_pro", status: "active" },
  });

  if (!addon) {
    return json({ error: "Analytics Pro required", data: null }, { status: 403 });
  }

  // Get 7-day trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dailyUsage = await db.$queryRaw<Array<{ day: string; count: number }>>`
    SELECT DATE(timestamp) as day, COUNT(*) as count
    FROM UsageLog
    WHERE shopId = ${shop} AND timestamp >= ${sevenDaysAgo.toISOString()}
    GROUP BY DATE(timestamp)
    ORDER BY day ASC
  `;

  // Get top products
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

  // Get revenue attribution
  const attributedOrders = await db.orderAttribution.findMany({
    where: {
      shopId: shop,
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      orderTotal: true,
      productIds: true,
    },
  });

  const totalRevenue = attributedOrders.reduce((sum, order) => sum + order.orderTotal, 0);
  const orderCount = attributedOrders.length;

  return json({
    error: null,
    data: {
      dailyUsage,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        count: p._count,
      })),
      revenue: {
        total: totalRevenue,
        orderCount,
        avgOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      },
    },
  });
}

export default function AnalyticsPro() {
  const { error, data } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <Page title="Analytics Pro" backAction={{ url: "/app/pricing-dashboard" }}>
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="p" tone="critical">
                {error}
              </Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="Analytics Pro" backAction={{ url: "/app/pricing-dashboard" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                📊 Revenue Attribution (Last 7 Days)
              </Text>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <div>
                  <Text as="p" tone="subdued">Total Revenue</Text>
                  <Text as="p" variant="headingLg">${data.revenue.total.toFixed(2)}</Text>
                </div>
                <div>
                  <Text as="p" tone="subdued">Orders</Text>
                  <Text as="p" variant="headingLg">{data.revenue.orderCount}</Text>
                </div>
                <div>
                  <Text as="p" tone="subdued">Avg Order Value</Text>
                  <Text as="p" variant="headingLg">${data.revenue.avgOrderValue.toFixed(2)}</Text>
                </div>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                🔥 Top Products Added (Last 7 Days)
              </Text>
              {data.topProducts.length === 0 ? (
                <Text as="p">No data yet. Products added via widgets will appear here.</Text>
              ) : (
                <div>
                  {data.topProducts.map((product, index) => (
                    <div key={product.productId} style={{ padding: "8px 0", borderBottom: "1px solid #e1e3e5" }}>
                      <Text as="p">
                        #{index + 1} Product ID: {product.productId} — {product.count} adds
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                📈 Daily Interaction Trend (Last 7 Days)
              </Text>
              {data.dailyUsage.length === 0 ? (
                <Text as="p">No interaction data yet.</Text>
              ) : (
                <div>
                  {data.dailyUsage.map((day) => (
                    <div key={day.day} style={{ padding: "8px 0" }}>
                      <Text as="p">
                        {day.day}: {day.count} interactions
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
