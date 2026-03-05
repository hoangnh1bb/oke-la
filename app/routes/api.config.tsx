import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

/**
 * Mock config API — UI only, no database.
 * Returns ok: true for go-live flow demonstration.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  if (request.method !== "POST") {
    throw new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse form data (UI submits widgets as form)
  const formData = await request.formData();
  const widgetsJson = formData.get("widgets") as string | null;
  if (widgetsJson) {
    try {
      JSON.parse(widgetsJson);
    } catch {
      // ignore parse errors for mock
    }
  }

  return { ok: true };
};
