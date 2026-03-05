import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// App proxy catch-all: handles all /apps/smartrec/* storefront requests
// Shopify verifies HMAC signature before forwarding here

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid, session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/proxy\/?/, "");

  // Route to appropriate handler based on subpath
  switch (subpath) {
    case "products":
      // TODO: [Widget Renderer plan] Return product recommendations
      return Response.json({ products: [], source: "smartrec" });

    case "intent":
      // TODO: [Intent Engine plan] Return action for intent score
      return Response.json({ action: "none" });

    default:
      // Health check / catch-all
      return Response.json({
        ok: true,
        app: "smartrec",
        shop: url.searchParams.get("shop"),
      });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/proxy\/?/, "");

  switch (subpath) {
    case "track":
      // TODO: [Signal Collector plan] Receive behavioral signals from storefront
      return Response.json({ tracked: true });

    default:
      return Response.json({ error: "not_found" }, { status: 404 });
  }
};
