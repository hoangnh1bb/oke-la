/**
 * App Proxy catch-all — mirrors api.proxy.$.tsx
 * Shopify CLI may route proxy to /proxy/* during dev.
 */
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import {
  handleIntent,
  handleProducts,
  handleConfig,
  handleTrack,
} from "../lib/proxy-handlers.server";

function getSubpath(request: Request): string {
  const url = new URL(request.url);
  const segments = url.pathname.replace(/^\/proxy\/?/, "").split("/");
  return segments[0] || "";
}

function extractShop(url: URL, proxySession?: { shop: string }): string {
  return proxySession?.shop || url.searchParams.get("shop") || "";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const proxy = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const subpath = getSubpath(request);
  const shop = extractShop(url, proxy.session);

  console.log("[SmartRec] Proxy loader (proxy.$):", subpath, "shop:", shop);

  try {
    switch (subpath) {
      case "products":
        return handleProducts(url.searchParams, proxy.admin!, shop);
      case "config":
        return handleConfig(url.searchParams, shop);
      default:
        return data({ error: "Not found" }, { status: 404 });
    }
  } catch (e) {
    console.error("[SmartRec] Proxy loader error:", e);
    return data({ type: "none" });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const proxy = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const subpath = getSubpath(request);
  const shop = extractShop(url, proxy.session);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[SmartRec] Proxy action (proxy.$):", subpath, "shop:", shop, "body:", JSON.stringify(body));

  try {
    switch (subpath) {
      case "track": {
        const result = await handleTrack(body, shop);
        console.log("[SmartRec] Track result:", JSON.stringify(result));
        return result;
      }
      case "intent":
        return handleIntent(body, proxy.admin!, shop);
      default:
        return data({ error: "Not found" }, { status: 404 });
    }
  } catch (e) {
    console.error("[SmartRec] Proxy action error:", e);
    return data({ error: "Server error", detail: String(e) }, { status: 500 });
  }
};
