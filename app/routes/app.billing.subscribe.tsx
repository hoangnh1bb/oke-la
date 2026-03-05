import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { createCharge } from "../lib/billing.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const subscription = await db.subscription.findUnique({ where: { shopId: shop } });

    if (subscription && subscription.plan === "growth" && subscription.status === "active") {
      return redirect("/app");
    }

    const result = await createCharge({
      shop,
      plan: "growth",
      returnUrl: `https://${shop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE}/app`,
      billing,
    });

    if (!result.success || !result.confirmationUrl) {
      throw new Error(result.error || "Failed to create charge");
    }

    await db.subscription.upsert({
      where: { shopId: shop },
      create: {
        shopId: shop,
        plan: "growth",
        status: "pending",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      update: {
        plan: "growth",
        status: "pending",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return redirect(result.confirmationUrl);
  } catch (error) {
    console.error("Billing error:", error);
    return redirect("/app?error=billing_failed");
  }
}
