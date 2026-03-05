import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return Response.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
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
      usageCount: count,
      limit,
      plan,
      percentage: limit ? Math.round((count / limit) * 100) : 0,
    });
  } catch (error) {
    console.error("Error fetching quota:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
