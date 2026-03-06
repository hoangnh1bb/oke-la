import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useActionData, Form } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { upsertProductCacheFromPayload } from "../lib/ai/product-cache-upsert-from-webhook-payload.server";

const AGENTS = [
  {
    key: "explainer",
    name: "Product Explainer",
    description: "AI explains why a product suits the customer based on their browsing behavior.",
    settingsField: "aiExplanationsEnabled" as const,
    widgetType: "explainer",
    icon: "💡",
  },
  {
    key: "quiz",
    name: "Guided Quiz",
    description: "Interactive quiz that recommends products based on customer preferences.",
    settingsField: "aiQuizEnabled" as const,
    widgetType: "quiz",
    icon: "❓",
  },
  {
    key: "visual",
    name: "Visual Search",
    description: "Find visually similar products using AI image matching. Requires Pro plan.",
    settingsField: "aiVisualEnabled" as const,
    widgetType: "visual",
    icon: "🔍",
  },
  {
    key: "concierge",
    name: "Shopping Concierge",
    description: "AI chat assistant that helps customers find products through conversation. Requires Pro plan.",
    settingsField: "aiConciergeEnabled" as const,
    widgetType: "concierge",
    icon: "💬",
  },
] as const;

type AgentSettingsField = (typeof AGENTS)[number]["settingsField"];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [settings, eventCounts, cachedProductCount] = await Promise.all([
    db.shopSettings.upsert({
      where: { shop },
      update: {},
      create: { shop },
    }),
    db.smartRecEvent.groupBy({
      by: ["widgetType"],
      where: { shop, createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    }),
    db.productCache.count({ where: { shop } }),
  ]);

  const usageCounts: Record<string, number> = {};
  for (const row of eventCounts) {
    if (row.widgetType) usageCounts[row.widgetType] = row._count.id;
  }

  return { settings, usageCounts, cachedProductCount };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "toggle");

  // Bulk sync products into ProductCache so AI features have data to work with
  if (intent === "syncProducts") {
    try {
      let cursor: string | null = null;
      let synced = 0;

      do {
        const res = await admin.graphql(
          `#graphql
          query SyncProductsToCache($cursor: String) {
            products(first: 50, after: $cursor) {
              edges {
                node {
                  id
                  title
                  handle
                  productType
                  tags
                  status
                  variants(first: 1) { edges { node { price } } }
                  featuredImage { url }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }`,
          { variables: { cursor } }
        );
        const json = (await res.json()) as {
          data: {
            products: {
              edges: { node: Record<string, unknown> }[];
              pageInfo: { hasNextPage: boolean; endCursor: string };
            };
          };
        };

        for (const { node } of json.data.products.edges) {
          // Normalize to webhook payload shape
          const gid = String(node.id || "");
          const numericId = gid.replace(/^gid:\/\/shopify\/Product\//, "");
          const variants = (node.variants as { edges: { node: { price: string } }[] })?.edges ?? [];
          const imageUrl = (node.featuredImage as { url?: string } | null)?.url ?? "";

          await upsertProductCacheFromPayload(shop, {
            id: numericId,
            title: node.title,
            handle: node.handle,
            product_type: node.productType,
            tags: Array.isArray(node.tags) ? (node.tags as string[]).join(", ") : String(node.tags || ""),
            status: (node.status as string)?.toLowerCase() ?? "active",
            variants: variants.map((v) => ({ price: v.node.price })),
            image: imageUrl ? { src: imageUrl } : null,
          });
          synced++;
        }

        cursor = json.data.products.pageInfo.hasNextPage
          ? json.data.products.pageInfo.endCursor
          : null;
      } while (cursor);

      return { success: true, intent: "syncProducts", synced };
    } catch (err) {
      console.error("[AI Agents] product sync failed:", err);
      return { success: false, intent: "syncProducts", error: "Sync failed" };
    }
  }

  // Save concierge branding settings
  if (intent === "saveBranding") {
    const agentName = String(formData.get("agentName") ?? "SmartRec Assistant").trim();
    const agentColor = String(formData.get("agentColor") ?? "#4A90E2").trim();
    const proactiveMessage = String(formData.get("proactiveMessage") ?? "").trim();
    const systemPromptOverride = String(formData.get("systemPromptOverride") ?? "").trim() || null;

    if (!/^#[0-9A-Fa-f]{6}$/.test(agentColor)) {
      return { success: false, intent: "saveBranding", error: "Invalid color format" };
    }

    await db.shopSettings.upsert({
      where: { shop },
      update: { agentName, agentColor, proactiveMessage, systemPromptOverride },
      create: { shop, agentName, agentColor, proactiveMessage, systemPromptOverride },
    });

    return { success: true, intent: "saveBranding" };
  }

  // Toggle agent enabled state
  const agentType = String(formData.get("agentType") ?? "");
  const enabled = formData.get("enabled") === "true";

  const fieldMap: Record<string, AgentSettingsField> = {
    explainer: "aiExplanationsEnabled",
    quiz: "aiQuizEnabled",
    visual: "aiVisualEnabled",
    concierge: "aiConciergeEnabled",
  };

  const field = fieldMap[agentType];
  if (!field) return { success: false, error: "Unknown agent type" };

  await db.shopSettings.upsert({
    where: { shop },
    update: { [field]: enabled },
    create: { shop, [field]: enabled },
  });

  return { success: true, agentType, enabled };
};

export default function AiAgentsPage() {
  const { settings, usageCounts, cachedProductCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const shopify = useAppBridge();

  if (actionData?.success && actionData.intent !== "syncProducts") {
    const label = AGENTS.find((a) => a.key === actionData.agentType)?.name ?? "Agent";
    shopify.toast.show(
      `${label} ${actionData.enabled ? "enabled" : "disabled"} successfully`
    );
  }
  if (actionData?.success && actionData.intent === "syncProducts") {
    shopify.toast.show(`Synced ${(actionData as { synced?: number }).synced ?? 0} products successfully`);
  }
  if (actionData?.success && actionData.intent === "saveBranding") {
    shopify.toast.show("Branding settings saved");
  }

  return (
    <s-page heading="AI Agents">
      <s-section heading="Product Index">
        <p style={{ fontSize: "14px", color: "#555", margin: "0 0 12px" }}>
          AI features (Explainer, Concierge, Visual Search) need your product catalog indexed.{" "}
          <strong>{cachedProductCount} products</strong> currently indexed.
          {cachedProductCount === 0 && (
            <span style={{ color: "#c0392b" }}> Run a sync to enable AI features.</span>
          )}
        </p>
        <Form method="post">
          <input type="hidden" name="intent" value="syncProducts" />
          <s-button type="submit" variant="primary">
            {cachedProductCount === 0 ? "Sync Products Now" : "Re-sync Products"}
          </s-button>
        </Form>
      </s-section>

      <s-section heading="Setup Instructions">
        <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>
          The <strong>Concierge</strong> chat widget includes all AI features (explainer, quiz, visual search)
          in one unified chat interface. Enable it via <strong>App Embeds</strong> in the theme editor.
          Intent-based widgets (alternative nudge, comparison bar) are separate blocks
          added under <strong>Apps</strong> in theme sections.
        </p>
      </s-section>

      <s-section heading="Agent Toggles">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {AGENTS.map((agent) => {
            const isEnabled = settings[agent.settingsField] ?? false;
            const count = usageCounts[agent.widgetType] ?? 0;

            return (
              <div
                key={agent.key}
                style={{
                  border: "1px solid #e1e3e5",
                  borderRadius: "8px",
                  padding: "16px",
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600 }}>
                    {agent.icon} {agent.name}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: isEnabled ? "#d4edda" : "#f0f0f0",
                      color: isEnabled ? "#155724" : "#555",
                    }}
                  >
                    {isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <p style={{ fontSize: "13px", color: "#666", margin: "0 0 10px" }}>
                  {agent.description}
                </p>

                <p style={{ fontSize: "12px", color: "#999", margin: "0 0 12px" }}>
                  Usage last 30 days: <strong>{count}</strong> events
                </p>

                <Form method="post">
                  <input type="hidden" name="agentType" value={agent.key} />
                  <input type="hidden" name="enabled" value={String(!isEnabled)} />
                  <s-button
                    type="submit"
                    variant={isEnabled ? "secondary" : "primary"}
                  >
                    {isEnabled ? "Disable" : "Enable"}
                  </s-button>
                </Form>
              </div>
            );
          })}
        </div>
      </s-section>

      <s-section heading="Concierge Branding">
        <Form method="post">
          <input type="hidden" name="intent" value="saveBranding" />
          <div style={{ display: "grid", gap: "16px", maxWidth: "500px" }}>

            <div>
              <label htmlFor="agentName" style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
                Agent display name
              </label>
              <input
                id="agentName"
                name="agentName"
                type="text"
                defaultValue={settings.agentName}
                maxLength={50}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #c9cccf", borderRadius: "8px", fontSize: "14px" }}
              />
              <p style={{ fontSize: "12px", color: "#6d7175", margin: "4px 0 0" }}>Shown in chat header and welcome message</p>
            </div>

            <div>
              <label htmlFor="agentColor" style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
                Primary color
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  id="agentColor"
                  name="agentColor"
                  type="color"
                  defaultValue={settings.agentColor}
                  style={{ width: "40px", height: "36px", border: "1px solid #c9cccf", borderRadius: "6px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "13px", color: "#6d7175" }}>Used for chat bubble, buttons, and user message background</span>
              </div>
            </div>

            <div>
              <label htmlFor="proactiveMessage" style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
                Proactive nudge message
              </label>
              <textarea
                id="proactiveMessage"
                name="proactiveMessage"
                defaultValue={settings.proactiveMessage}
                rows={2}
                maxLength={200}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #c9cccf", borderRadius: "8px", fontSize: "14px", resize: "vertical", fontFamily: "inherit" }}
              />
              <p style={{ fontSize: "12px", color: "#6d7175", margin: "4px 0 0" }}>Shown in popover after 5 seconds on product pages</p>
            </div>

            <details style={{ marginTop: "8px" }}>
              <summary style={{ fontSize: "14px", fontWeight: 500, cursor: "pointer", color: "#202223" }}>
                Advanced: System prompt override
              </summary>
              <div style={{ marginTop: "8px" }}>
                <textarea
                  id="systemPromptOverride"
                  name="systemPromptOverride"
                  defaultValue={settings.systemPromptOverride ?? ""}
                  rows={5}
                  placeholder="Leave empty to use the default system prompt."
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #c9cccf", borderRadius: "8px", fontSize: "13px", resize: "vertical", fontFamily: "monospace" }}
                />
                <p style={{ fontSize: "12px", color: "#6d7175", margin: "4px 0 0" }}>Custom system prompt for the concierge agent. Leave empty for default behavior.</p>
              </div>
            </details>

            <div style={{ marginTop: "4px" }}>
              <s-button type="submit" variant="primary">Save branding</s-button>
            </div>
          </div>
        </Form>
      </s-section>
    </s-page>
  );
}
