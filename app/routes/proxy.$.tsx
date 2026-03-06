import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import {
  handleIntent,
  handleProducts,
  handleConfig,
  handleTrack,
} from "../lib/proxy-handlers.server";
import {
  handleExplain,
  handleQuiz,
  handleVisual,
  handleConcierge,
} from "../lib/ai/proxy-ai-handlers.server";
import { handleChat } from "../lib/ai/smartrec-concierge-proxy-handler.server";

function getSubpath(request: Request): string {
  const url = new URL(request.url);
  const segments = url.pathname.replace(/^\/proxy\/?/, "").split("/");
  return segments[0] || "";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const proxy = await authenticate.public.appProxy(request);
  const subpath = getSubpath(request);
  const url = new URL(request.url);
  const shop = proxy.session?.shop || url.searchParams.get("shop") || "";

  switch (subpath) {
    case "products":
      return handleProducts(url.searchParams, proxy.admin!, shop);
    case "config":
      return handleConfig(url.searchParams);
    case "quiz":
      return handleQuiz(request, shop, proxy.admin?.graphql as any);
    default:
      return data({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const proxy = await authenticate.public.appProxy(request);
  const subpath = getSubpath(request);
  const url = new URL(request.url);
  const shop = proxy.session?.shop || url.searchParams.get("shop") || "";

  // Quiz POST reads its own body internally
  if (subpath === "quiz") {
    return handleQuiz(request, shop, proxy.admin?.graphql as any);
  }

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
    case "explain":
      return handleExplain(body, shop);
    case "visual":
      return handleVisual(body, shop);
    case "concierge":
      return handleConcierge(body, shop);
    case "chat":
      return handleChat(body, shop, request.signal);
    default:
      return data({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }
};
