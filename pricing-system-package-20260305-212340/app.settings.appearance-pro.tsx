import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { Page, Layout, Card, FormLayout, TextField, Select, Button, BlockStack, Text } from "@shopify/polaris";
import db from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Check add-on access
  const addon = await db.addonSubscription.findFirst({
    where: { shopId: shop, addonType: "appearance_pro", status: "active" },
  });

  if (!addon) {
    return json({ error: "Appearance Pro required", config: null });
  }

  const config = await db.shopConfig.findUnique({
    where: { shopId: shop },
  });

  const widgetColors = config?.widgetColors ? JSON.parse(config.widgetColors) : {
    alternative_nudge: "#4A90E2",
    comparison_bar: "#50C878",
    tag_navigator: "#FF6B6B",
    trust_nudge: "#9B59B6",
  };

  const widgetTexts = config?.widgetTexts ? JSON.parse(config.widgetTexts) : {
    alternative_nudge: "Not sure? Others with similar taste chose:",
    comparison_bar: "You're also considering",
    tag_navigator: "Still looking? Try filtering by:",
    trust_nudge: "Trusted by customers",
  };

  return json({
    error: null,
    config: {
      widgetColors,
      widgetTexts,
      buttonStyle: config?.buttonStyle || "solid",
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const widgetColors = {
    alternative_nudge: formData.get("color_alternative_nudge")?.toString() || "#4A90E2",
    comparison_bar: formData.get("color_comparison_bar")?.toString() || "#50C878",
    tag_navigator: formData.get("color_tag_navigator")?.toString() || "#FF6B6B",
    trust_nudge: formData.get("color_trust_nudge")?.toString() || "#9B59B6",
  };

  const widgetTexts = {
    alternative_nudge: formData.get("text_alternative_nudge")?.toString() || "",
    comparison_bar: formData.get("text_comparison_bar")?.toString() || "",
    tag_navigator: formData.get("text_tag_navigator")?.toString() || "",
    trust_nudge: formData.get("text_trust_nudge")?.toString() || "",
  };

  const buttonStyle = formData.get("buttonStyle")?.toString() || "solid";

  await db.shopConfig.upsert({
    where: { shopId: shop },
    create: {
      shopId: shop,
      widgetColors: JSON.stringify(widgetColors),
      widgetTexts: JSON.stringify(widgetTexts),
      buttonStyle,
      primaryColor: "#4A90E2",
      headlineText: "Bạn có thể thích",
      updatedAt: new Date(),
    },
    update: {
      widgetColors: JSON.stringify(widgetColors),
      widgetTexts: JSON.stringify(widgetTexts),
      buttonStyle,
      updatedAt: new Date(),
    },
  });

  return redirect("/app/settings/appearance-pro?success=true");
}

export default function AppearanceProSettings() {
  const { error, config } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <Page title="Appearance Pro" backAction={{ url: "/app/billing/addon" }}>
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

  const widgets = [
    { key: "alternative_nudge", label: "Alternative Nudge" },
    { key: "comparison_bar", label: "Comparison Bar" },
    { key: "tag_navigator", label: "Tag Navigator" },
    { key: "trust_nudge", label: "Trust Nudge" },
  ];

  return (
    <Page title="Appearance Pro" backAction={{ url: "/app/billing/addon" }}>
      <Form method="post">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Per-Widget Colors
                </Text>
                {widgets.map((widget) => (
                  <TextField
                    key={widget.key}
                    label={widget.label}
                    name={`color_${widget.key}`}
                    type="color"
                    value={config.widgetColors[widget.key]}
                    autoComplete="off"
                  />
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Per-Widget Text
                </Text>
                {widgets.map((widget) => (
                  <TextField
                    key={widget.key}
                    label={widget.label}
                    name={`text_${widget.key}`}
                    value={config.widgetTexts[widget.key]}
                    autoComplete="off"
                    helpText="Custom text shown for this widget"
                  />
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <FormLayout>
                <Select
                  label="Button Style (All Widgets)"
                  name="buttonStyle"
                  options={[
                    { label: "Solid", value: "solid" },
                    { label: "Outline", value: "outline" },
                  ]}
                  value={config.buttonStyle}
                />

                <Button submit variant="primary">
                  Save All Changes
                </Button>
              </FormLayout>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Preview (Mock)
                </Text>
                <div style={{ padding: "16px", backgroundColor: "#f6f6f7", borderRadius: "8px" }}>
                  {widgets.map((widget) => (
                    <div key={widget.key} style={{ marginBottom: "12px" }}>
                      <p style={{ color: config.widgetColors[widget.key], fontWeight: "bold", fontSize: "12px" }}>
                        {config.widgetTexts[widget.key] || widget.label}
                      </p>
                      <button
                        style={{
                          marginTop: "4px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          backgroundColor: config.buttonStyle === "solid" ? config.widgetColors[widget.key] : "transparent",
                          color: config.buttonStyle === "solid" ? "white" : config.widgetColors[widget.key],
                          border: `2px solid ${config.widgetColors[widget.key]}`,
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Form>
    </Page>
  );
}
