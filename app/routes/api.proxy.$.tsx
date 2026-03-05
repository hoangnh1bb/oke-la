/**
 * App Proxy catch-all route.
 * All storefront requests arrive via Shopify App Proxy at /apps/smartrec/*
 * which maps to this route at /api/proxy/*.
 * Validates HMAC, routes to internal handlers based on sub-path.
 * Returns { type: "none" } on any error — never break the storefront.
 */
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { validateProxySignature } from "../lib/smartrec/proxy-auth.server";
import { evaluateIntent } from "../lib/smartrec/intent-engine.server";
import { findAlternativeProducts } from "../lib/smartrec/alternatives-finder.server";
import type { SignalPayload, TrackPayload } from "../lib/smartrec/types";
import prisma from "../db.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getSubPath(params: Record<string, string | undefined>): string {
  return params["*"] || "";
}

// --- GET handlers (config, alternatives) ---

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  if (!validateProxySignature(url)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const subPath = getSubPath(params);
  const shop = url.searchParams.get("shop") || "";

  try {
    switch (subPath) {
      case "api/config":
        return handleGetConfig(shop);
      case "api/alternatives":
        return handleGetAlternatives(url, shop);
      default:
        return json({ error: "Not found" }, 404);
    }
  } catch {
    return json({ type: "none" });
  }
}

// --- POST handlers (intent, track) ---

export async function action({ request, params }: ActionFunctionArgs) {
  const url = new URL(request.url);
  if (!validateProxySignature(url)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const subPath = getSubPath(params);

  try {
    const body = await request.json();
    switch (subPath) {
      case "api/intent":
        return handlePostIntent(body as SignalPayload);
      case "api/track":
        return handlePostTrack(body as TrackPayload);
      default:
        return json({ error: "Not found" }, 404);
    }
  } catch {
    return json({ type: "none" });
  }
}

// --- Handler implementations ---

async function handlePostIntent(body: SignalPayload) {
  const action = await evaluateIntent(body);
  return json(action);
}

async function handleGetConfig(shop: string) {
  const settings = await prisma.smartRecSettings.findUnique({ where: { shop } });
  if (!settings) return json({ enabled: true }); // Default enabled for new stores
  return json({
    enabled: settings.enabled,
    ucHesitationMin: settings.ucHesitationMin,
    ucHesitationMax: settings.ucHesitationMax,
    ucCompareEnabled: settings.ucCompareEnabled,
    ucLostBackNavMin: settings.ucLostBackNavMin,
    ucCartHesitationSec: settings.ucCartHesitationSec,
    maxAlternatives: settings.maxAlternatives,
  });
}

async function handleGetAlternatives(url: URL, shop: string) {
  const productId = url.searchParams.get("productId") || "";
  const productType = url.searchParams.get("productType") || "";
  const productTags = (url.searchParams.get("tags") || "").split(",").filter(Boolean);

  if (!productId) return json({ error: "productId required" }, 400);

  const currentProduct = {
    id: productId,
    type: productType,
    tags: productTags,
    title: "",
    price: "",
    image: "",
  };

  const alts = await findAlternativeProducts(shop, currentProduct, [], 2);
  return json({ products: alts });
}

async function handlePostTrack(body: TrackPayload) {
  await prisma.analyticsEvent.create({
    data: {
      shop: body.shop,
      sessionId: body.sessionId,
      eventType: body.eventType,
      widgetType: body.widgetType,
      productId: body.productId || null,
      intentScore: body.intentScore || null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    },
  });
  return json({ ok: true });
}
