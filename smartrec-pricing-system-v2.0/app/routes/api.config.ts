import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { rateLimit } from "../middleware/rate-limit.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return Response.json({ error: "Missing shop parameter" }, { status: 400, headers });
    }

    // Rate limiting
    if (!rateLimit("config", shop)) {
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers }
      );
    }

    const config = await db.shopConfig.findUnique({
      where: { shopId: shop },
    });

    const defaultConfig = {
      primaryColor: "#4A90E2",
      widgetColors: null,
      buttonStyle: "solid",
    };

    return Response.json(config || defaultConfig, { headers });
  } catch (error) {
    console.error("Error fetching config:", error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
