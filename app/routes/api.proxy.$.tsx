/**
 * App Proxy catch-all route.
 * Shopify proxies /apps/smartrec/* to this route at /api/proxy/*.
 * Uses authenticate.public.appProxy for HMAC validation + admin client.
 * Delegates to proxy-handlers.server.ts for intent engine + data fetching.
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

function getSubpath(params: Record<string, string | undefined>): string {
  return params["*"] || "";
}

function extractShop(url: URL, proxySession?: { shop: string }): string {
  return proxySession?.shop || url.searchParams.get("shop") || "";
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const proxy = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const subpath = getSubpath(params);
  const shop = extractShop(url, proxy.session);

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

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const proxy = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const subpath = getSubpath(params);
  const shop = extractShop(url, proxy.session);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[SmartRec] Proxy action:", subpath, "shop:", shop, "body:", JSON.stringify(body));

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
