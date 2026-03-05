import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { shop, widgetType, productId, eventType, srSource } = body;

    if (!shop || !widgetType || !eventType) {
      return Response.json(
        { error: "Missing required fields: shop, widgetType, eventType" },
        { status: 400 }
      );
    }

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
    });
  } catch (error) {
    console.error("Error tracking interaction:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
