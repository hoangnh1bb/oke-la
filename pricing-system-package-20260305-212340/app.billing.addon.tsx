import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { Page, Layout, Card, Button, BlockStack, Text } from "@shopify/polaris";
import { createCharge } from "~/pricing-system/core/billing-manager";
import db from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Check subscription
  const subscription = await db.subscription.findUnique({
    where: { shopId: shop },
  });

  // Check add-ons
  const addons = await db.addonSubscription.findMany({
    where: { shopId: shop, status: "active" },
  });

  return json({
    plan: subscription?.plan || "free",
    hasAppearancePro: addons.some((a) => a.addonType === "appearance_pro"),
    hasAnalyticsPro: addons.some((a) => a.addonType === "analytics_pro"),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const addonType = formData.get("addon")?.toString() as "appearance_pro" | "analytics_pro";

  if (!addonType || !["appearance_pro", "analytics_pro"].includes(addonType)) {
    return json({ error: "Invalid add-on type" }, { status: 400 });
  }

  try {
    const result = await createCharge({
      shop,
      plan: addonType,
      returnUrl: `https://${shop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE}/app/billing/addon`,
      billing,
    });

    if (!result.success || !result.confirmationUrl) {
      throw new Error(result.error || "Failed to create charge");
    }

    // Store pending add-on
    await db.addonSubscription.create({
      data: {
        shopId: shop,
        addonType,
        status: "pending",
      },
    });

    return redirect(result.confirmationUrl);
  } catch (error) {
    console.error("Add-on purchase error:", error);
    return json({ error: "Failed to purchase add-on" }, { status: 500 });
  }
}

export default function AddonPurchase() {
  const { plan, hasAppearancePro, hasAnalyticsPro } = useLoaderData<typeof loader>();

  if (plan === "free") {
    return (
      <Page title="Add-ons" backAction={{ url: "/app/pricing-dashboard" }}>
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="p">
                ⚠️ Add-ons require Growth plan. Please upgrade first.
              </Text>
              <Button url="/app/billing/subscribe" variant="primary">
                Upgrade to Growth
              </Button>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="Add-ons" backAction={{ url: "/app/pricing-dashboard" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                🎨 Giao Diện Pro — $5/month
              </Text>
              <Text as="p">
                Tùy chỉnh chi tiết màu sắc cho từng widget riêng, chọn kiểu nút, và chỉnh câu chữ cho từng vị trí.
              </Text>
              {hasAppearancePro ? (
                <Text as="p" tone="success">
                  ✅ Active
                </Text>
              ) : (
                <Form method="post">
                  <input type="hidden" name="addon" value="appearance_pro" />
                  <Button submit variant="primary">
                    Purchase for $5/month
                  </Button>
                </Form>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                📊 Thống Kê Pro — $7/month
              </Text>
              <Text as="p">
                Bảng top sản phẩm được thêm nhiều nhất, số đơn hàng có sản phẩm từ app, và tổng giá trị đơn hàng gắn với app.
              </Text>
              {hasAnalyticsPro ? (
                <Text as="p" tone="success">
                  ✅ Active
                </Text>
              ) : (
                <Form method="post">
                  <input type="hidden" name="addon" value="analytics_pro" />
                  <Button submit variant="primary">
                    Purchase for $7/month
                  </Button>
                </Form>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
