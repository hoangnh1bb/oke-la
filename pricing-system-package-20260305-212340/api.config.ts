import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import db from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    const config = await db.shopConfig.findUnique({
      where: { shopId: shop },
    });

    if (!config) {
      // Return defaults
      return json({
        primaryColor: "#4A90E2",
        headlineText: "Bạn có thể thích",
        widgetColors: null,
        widgetTexts: null,
        buttonStyle: "solid",
      });
    }

    return json({
      primaryColor: config.primaryColor,
      headlineText: config.headlineText,
      widgetColors: config.widgetColors ? JSON.parse(config.widgetColors) : null,
      widgetTexts: config.widgetTexts ? JSON.parse(config.widgetTexts) : null,
      buttonStyle: config.buttonStyle,
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
