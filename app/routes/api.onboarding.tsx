import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

const FETCH_PRODUCTS_QUERY = `#graphql
  query FetchDemoProducts {
    products(first: 4) {
      edges {
        node {
          id
          title
          handle
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          featuredImage {
            url
            altText
          }
        }
      }
    }
  }
`;

export type DemoProduct = {
  id: string;
  title: string;
  handle: string;
  price: string;
  currency: string;
  image: string | null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(FETCH_PRODUCTS_QUERY);
  const data = await response.json();
  const products: DemoProduct[] =
    data.data?.products?.edges?.map((e: { node: Record<string, unknown> }) => ({
      id: String(e.node.id),
      title: String(e.node.title ?? ""),
      handle: String(e.node.handle ?? ""),
      price:
        String(
          (e.node.priceRange as { minVariantPrice?: { amount?: string } })
            ?.minVariantPrice?.amount ?? "0"
        ),
      currency:
        String(
          (e.node.priceRange as { minVariantPrice?: { currencyCode?: string } })
            ?.minVariantPrice?.currencyCode ?? "USD"
        ),
      image: (e.node.featuredImage as { url?: string } | null)?.url ?? null,
    })) ?? [];

  return {
    shop: session.shop,
    storeUrl: `https://${session.shop}`,
    demoProducts: products,
  };
};
