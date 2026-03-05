import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { Page, Layout, Card, FormLayout, TextField, Select, Button, BlockStack } from "@shopify/polaris";
import db from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await db.shopConfig.findUnique({
    where: { shopId: shop },
  });

  return json({
    config: config || {
      primaryColor: "#4A90E2",
      headlineText: "Bạn có thể thích",
      buttonStyle: "solid",
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const primaryColor = formData.get("primaryColor")?.toString() || "#4A90E2";
  const headlineText = formData.get("headlineText")?.toString() || "Bạn có thể thích";
  const buttonStyle = formData.get("buttonStyle")?.toString() || "solid";

  await db.shopConfig.upsert({
    where: { shopId: shop },
    create: {
      shopId: shop,
      primaryColor,
      headlineText,
      buttonStyle,
      updatedAt: new Date(),
    },
    update: {
      primaryColor,
      headlineText,
      buttonStyle,
      updatedAt: new Date(),
    },
  });

  return redirect("/app/settings/appearance?success=true");
}

export default function AppearanceSettings() {
  const { config } = useLoaderData<typeof loader>();

  return (
    <Page title="Appearance Settings" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <Form method="post">
              <FormLayout>
                <TextField
                  label="Primary Color"
                  name="primaryColor"
                  type="color"
                  value={config.primaryColor}
                  autoComplete="off"
                  helpText="This color will be used for all widgets"
                />

                <TextField
                  label="Headline Text"
                  name="headlineText"
                  value={config.headlineText}
                  autoComplete="off"
                  helpText="Default text shown above product recommendations"
                />

                <Select
                  label="Button Style"
                  name="buttonStyle"
                  options={[
                    { label: "Solid", value: "solid" },
                    { label: "Outline", value: "outline" },
                  ]}
                  value={config.buttonStyle}
                />

                <Button submit variant="primary">
                  Save Changes
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <text as="h3" variant="headingSm">
                Preview
              </text>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f6f6f7",
                  borderRadius: "8px",
                }}
              >
                <p style={{ color: config.primaryColor, fontWeight: "bold" }}>
                  {config.headlineText}
                </p>
                <button
                  style={{
                    marginTop: "8px",
                    padding: "8px 16px",
                    backgroundColor: config.buttonStyle === "solid" ? config.primaryColor : "transparent",
                    color: config.buttonStyle === "solid" ? "white" : config.primaryColor,
                    border: `2px solid ${config.primaryColor}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
