import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Form, redirect } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type WidgetMap = Record<string, string>;

type LoaderData =
  | { error: string; config: null }
  | { error: null; config: { widgetColors: WidgetMap; widgetTexts: WidgetMap; buttonStyle: string } };

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const addon = await db.addonSubscription.findFirst({
    where: { shopId: shop, addonType: "appearance_pro", status: "active" },
  });

  if (!addon) {
    return Response.json({ error: "Appearance Pro required", config: null });
  }

  const config = await db.shopConfig.findUnique({ where: { shopId: shop } });

  const widgetColors: WidgetMap = config?.widgetColors ? JSON.parse(config.widgetColors) : {
    alternative_nudge: "#4A90E2",
    comparison_bar: "#50C878",
    tag_navigator: "#FF6B6B",
    trust_nudge: "#9B59B6",
  };

  const widgetTexts: WidgetMap = config?.widgetTexts ? JSON.parse(config.widgetTexts) : {
    alternative_nudge: "Not sure? Others with similar taste chose:",
    comparison_bar: "You're also considering",
    tag_navigator: "Still looking? Try filtering by:",
    trust_nudge: "Trusted by customers",
  };

  return Response.json({
    error: null,
    config: { widgetColors, widgetTexts, buttonStyle: config?.buttonStyle || "solid" },
  });
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
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

const WIDGETS = [
  { key: "alternative_nudge", label: "Alternative Nudge" },
  { key: "comparison_bar", label: "Comparison Bar" },
  { key: "tag_navigator", label: "Tag Navigator" },
  { key: "trust_nudge", label: "Trust Nudge" },
];

export default function AppearanceProSettings() {
  const loaderData = useLoaderData<LoaderData>();
  const { error } = loaderData;

  if (error) {
    return (
      <s-page heading="Appearance Pro">
        <s-section>
          <p style={{ color: "red" }}>{error}</p>
          <s-button href="/app/billing/addon">Upgrade to get Appearance Pro</s-button>
        </s-section>
      </s-page>
    );
  }

  const config = loaderData.config!;

  return (
    <s-page heading="Appearance Pro">
      <Form method="post">
        <s-section heading="Per-Widget Colors">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {WIDGETS.map((widget) => (
              <div key={widget.key}>
                <label htmlFor={`color_${widget.key}`} style={{ display: "block", marginBottom: "4px" }}>
                  {widget.label}
                </label>
                <input
                  id={`color_${widget.key}`}
                  type="color"
                  name={`color_${widget.key}`}
                  defaultValue={config.widgetColors[widget.key]}
                />
              </div>
            ))}
          </div>
        </s-section>

        <s-section heading="Per-Widget Text">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {WIDGETS.map((widget) => (
              <div key={widget.key}>
                <label htmlFor={`text_${widget.key}`} style={{ display: "block", marginBottom: "4px" }}>
                  {widget.label}
                </label>
                <input
                  id={`text_${widget.key}`}
                  type="text"
                  name={`text_${widget.key}`}
                  defaultValue={config.widgetTexts[widget.key]}
                  style={{ width: "100%", padding: "8px", border: "1px solid #c9cccf", borderRadius: "4px" }}
                />
              </div>
            ))}
          </div>
        </s-section>

        <s-section heading="Button Style">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label htmlFor="buttonStyle" style={{ display: "block", marginBottom: "4px" }}>
                Button Style (All Widgets)
              </label>
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
              <s-button variant="primary" type="submit">Save All Changes</s-button>
            </div>
          </div>
        </s-section>
      </Form>
    </s-page>
  );
}
