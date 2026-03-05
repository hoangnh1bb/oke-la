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
    if (!rateLimit("quota", shop)) {
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers }
      );
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageCount = await db.usageLog.count({
      where: { shopId: shop, timestamp: { gte: startOfMonth } },
    });

    const subscription = await db.subscription.findUnique({
      where: { shopId: shop },
    });

    const plan = subscription?.plan || "free";
    const limit = plan === "free" ? 500 : null;
    const percentage = limit ? Math.round((usageCount / limit) * 100) : 0;

    return Response.json({
      usageCount,
      limit,
      plan,
      percentage,
      shouldShowBanner: plan === "free" && usageCount >= 450,
    }, { headers });
  } catch (error) {
    console.error("Error fetching quota:", error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
