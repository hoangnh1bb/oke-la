import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Form, redirect } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type ConfigData = {
  primaryColor: string;
  headlineText: string;
  buttonStyle: string;
};

type LoaderData = { config: ConfigData };

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await db.shopConfig.findUnique({ where: { shopId: shop } });

  return Response.json({
    config: config || {
      primaryColor: "#4A90E2",
      headlineText: "Bạn có thể thích",
      buttonStyle: "solid",
    },
  });
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const primaryColor = formData.get("primaryColor")?.toString() || "#4A90E2";
  const headlineText = formData.get("headlineText")?.toString() || "Bạn có thể thích";
  const buttonStyle = formData.get("buttonStyle")?.toString() || "solid";

  await db.shopConfig.upsert({
    where: { shopId: shop },
    create: { shopId: shop, primaryColor, headlineText, buttonStyle, updatedAt: new Date() },
    update: { primaryColor, headlineText, buttonStyle, updatedAt: new Date() },
  });

  return redirect("/app/settings/appearance?success=true");
}

export default function AppearanceSettings() {
  const { config } = useLoaderData<LoaderData>();

  return (
    <s-page heading="Appearance Settings">
      <s-section>
        <Form method="post">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="primaryColor" style={{ display: "block", marginBottom: "4px" }}>Primary Color</label>
              <input id="primaryColor" type="color" name="primaryColor" defaultValue={config.primaryColor} />
              <p style={{ color: "#6d7175", fontSize: "12px" }}>This color will be used for all widgets</p>
            </div>
            <div>
              <label htmlFor="headlineText" style={{ display: "block", marginBottom: "4px" }}>Headline Text</label>
              <input
                id="headlineText"
                type="text"
                name="headlineText"
                defaultValue={config.headlineText}
                style={{ width: "100%", padding: "8px", border: "1px solid #c9cccf", borderRadius: "4px" }}
              />
              <p style={{ color: "#6d7175", fontSize: "12px" }}>Default text shown above product recommendations</p>
            </div>
            <div>
              <label htmlFor="buttonStyle" style={{ display: "block", marginBottom: "4px" }}>Button Style</label>
              <select
                id="buttonStyle"
                name="buttonStyle"
                defaultValue={config.buttonStyle}
                style={{ padding: "8px", border: "1px solid #c9cccf", borderRadius: "4px" }}
              >
                <option value="solid">Solid</option>
                <option value="outline">Outline</option>
              </select>
            </div>
            <div>
              <s-button variant="primary" type="submit">Save Changes</s-button>
            </div>
          </div>
        </Form>
      </s-section>

      <s-section heading="Preview">
        <div style={{ padding: "16px", backgroundColor: "#f6f6f7", borderRadius: "8px" }}>
          <p style={{ color: config.primaryColor, fontWeight: "bold" }}>{config.headlineText}</p>
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
      </s-section>
    </s-page>
  );
}
