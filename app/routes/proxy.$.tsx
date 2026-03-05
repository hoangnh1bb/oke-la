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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const proxy = await authenticate.public.appProxy(request);
  const subpath = getSubpath(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";

  switch (subpath) {
    case "products":
      return handleProducts(url.searchParams, proxy.admin!, shop);
    case "config":
      return handleConfig(url.searchParams);
    default:
      return data({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const proxy = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const subpath = getSubpath(request);
  const shop = url.searchParams.get("shop") || "";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON", code: "BAD_REQUEST" }, { status: 400 });
  }

  switch (subpath) {
    case "track":
      return handleTrack(body);
    case "intent":
      return handleIntent(body, proxy.admin!, shop);
    default:
      return data({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }
};
