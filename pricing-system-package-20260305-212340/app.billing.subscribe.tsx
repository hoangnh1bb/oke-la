import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { createCharge } from "~/pricing-system/core/billing-manager";
import db from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Check if already subscribed
    const subscription = await db.subscription.findUnique({
      where: { shopId: shop },
    });

    if (subscription && subscription.plan === "growth" && subscription.status === "active") {
      return redirect("/app");
    }

    // Create charge
    const result = await createCharge({
      shop,
      plan: "growth",
      returnUrl: `https://${shop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE}/app`,
      billing,
    });

    if (!result.success || !result.confirmationUrl) {
      throw new Error(result.error || "Failed to create charge");
    }

    // Store pending subscription
    await db.subscription.upsert({
      where: { shopId: shop },
      create: {
        shopId: shop,
        plan: "growth",
        status: "pending",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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
