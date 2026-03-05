import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { rateLimit } from "../middleware/rate-limit.server";

export async function action({ request }: ActionFunctionArgs) {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*", // TODO: Restrict to shop domains
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { shop, widgetType, productId, eventType, srSource } = body;

    if (!shop || !widgetType || !eventType) {
      return Response.json(
        { error: "Missing required fields: shop, widgetType, eventType" },
        { status: 400, headers }
      );
    }

    // Rate limiting
    if (!rateLimit("track", shop)) {
      return Response.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429, headers }
      );
    }

    // Log interaction
    await db.usageLog.create({
      data: {
        shopId: shop,
        widgetType,
        productId: productId || null,
        eventType,
        srSource: srSource || false,
        timestamp: new Date(),
      },
    });

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await db.usageLog.count({
      where: {
        shopId: shop,
        timestamp: { gte: startOfMonth },
      },
    });

    const subscription = await db.subscription.findUnique({
      where: { shopId: shop },
    });

    const plan = subscription?.plan || "free";
    const limit = plan === "free" ? 500 : null;

    return Response.json({
      success: true,
      usageCount: count,
      limit,
      plan,
      shouldShowBanner: plan === "free" && count >= 450,
    }, { headers });
  } catch (error) {
    console.error("Error tracking interaction:", error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
