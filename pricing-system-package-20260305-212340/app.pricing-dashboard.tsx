import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { Page, Layout, Card, Text, ProgressBar, Button, BlockStack } from "@shopify/polaris";
import db from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get subscription
  const subscription = await db.subscription.findUnique({
    where: { shopId: shop },
  });

  // Get current month usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageCount = await db.usageLog.count({
    where: {
      shopId: shop,
      timestamp: { gte: startOfMonth },
    },
  });

  const plan = subscription?.plan || "free";
  const limit = plan === "free" ? 500 : null;

  return json({
    plan,
    usageCount,
    limit,
    percentage: limit ? Math.round((usageCount / limit) * 100) : 0,
  });
}

export default function PricingDashboard() {
  const { plan, usageCount, limit, percentage } = useLoaderData<typeof loader>();

  return (
    <Page title="Pricing & Usage">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Current Plan: {plan.toUpperCase()}
              </Text>
              
              {plan === "free" && (
                <>
                  <Text as="p">
                    Usage this month: {usageCount} / {limit} interactions
                  </Text>
                  <ProgressBar progress={percentage} />
                  
                  {usageCount >= 450 && (
                    <Text as="p" tone="warning">
                      ⚠️ You're approaching your limit. Consider upgrading to Growth plan for unlimited usage.
                    </Text>
                  )}
                  
                  <Button url="/app/billing/subscribe" variant="primary">
                    Upgrade to Growth ($11/month)
                  </Button>
                </>
              )}

              {plan === "growth" && (
                <>
                  <Text as="p">
                    ✅ Unlimited interactions
                  </Text>
                  <Text as="p">
                    Usage this month: {usageCount} interactions
                  </Text>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {plan === "growth" && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Add-ons
                </Text>
                
                <Text as="p">
                  🎨 Giao Diện Pro — $5/month
                </Text>
                <Text as="p" tone="subdued">
                  Per-widget colors, button styles, custom text
                </Text>
                <Button>Purchase Giao Diện Pro</Button>

                <Text as="p">
                  📊 Thống Kê Pro — $7/month
                </Text>
                <Text as="p" tone="subdued">
                  Top products, revenue attribution, 7-day trends
                </Text>
                <Button>Purchase Thống Kê Pro</Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
