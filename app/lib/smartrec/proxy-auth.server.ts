/**
 * Shopify App Proxy HMAC signature validation.
 * Verifies that incoming requests genuinely come from Shopify's proxy infrastructure.
 * See: https://shopify.dev/docs/apps/online-store/app-proxy#calculate-a-digital-signature
 */
import crypto from "crypto";

export function validateProxySignature(url: URL): boolean {
  // Dev bypass: skip HMAC when no signature present in development
  if (process.env.NODE_ENV === "development" && !url.searchParams.get("signature")) {
    return true;
  }

  const params = new URLSearchParams(url.search);
  const signature = params.get("signature");
  if (!signature) return false;

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  // Remove signature from params before computing
  params.delete("signature");

  // Sort params alphabetically, join as key=value pairs (no separator between pairs)
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("");

  const computed = crypto
    .createHmac("sha256", secret)
    .update(sortedParams)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(computed, "hex"),
    );
  } catch {
    return false;
  }
}
