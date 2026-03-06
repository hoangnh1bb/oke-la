// Job that fetches the full product catalog via Admin GraphQL and regenerates quiz config
// Stores result in QuizConfig table; called on-demand when config is stale (> 24h)
import prisma from "../db.server";
import { generateQuizConfig } from "./ai/quiz-config-generator-from-catalog.server";
import type {
  QuizConfig,
  ShopifyProductSummary,
} from "./ai/quiz-config-generator-from-catalog.server";

// Shopify's admin.graphql() returns a Response; we call .json() to get { data }
type AdminGraphql = (
  query: string,
  options?: unknown
) => Promise<Response>;

export async function refreshQuizConfig(
  shopId: string,
  adminGraphql: AdminGraphql
): Promise<QuizConfig> {
  const products = await fetchAllProducts(adminGraphql);
  const config = await generateQuizConfig(products);

  await prisma.quizConfig.upsert({
    where: { shopId },
    create: { shopId, config: JSON.stringify(config) },
    update: { config: JSON.stringify(config) },
  });

  return config;
}

async function fetchAllProducts(adminGraphql: AdminGraphql) {
  const all: ShopifyProductSummary[] = [];
  let cursor: string | null = null;

  do {
    const res = await adminGraphql(
      `#graphql
      query GetProductsForQuiz($cursor: String) {
        products(first: 250, after: $cursor) {
          edges {
            node {
              productType
              tags
              priceRangeV2 {
                minVariantPrice { amount }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { variables: { cursor } }
    );

    const json = (await res.json()) as {
      data: {
        products: {
          edges: { node: unknown }[];
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      };
    };

    const { products } = json.data;
    all.push(...products.edges.map((e) => e.node as ShopifyProductSummary));
    cursor = products.pageInfo.hasNextPage
      ? products.pageInfo.endCursor
      : null;
  } while (cursor);

  return all;
}
