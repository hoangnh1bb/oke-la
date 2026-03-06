// Indexes product images by generating CLIP embeddings and storing them for visual similarity search
// Paginates through all products via Admin GraphQL; also supports single-product indexing
import { embedImage } from "./text-and-image-embeddings.server";
import { upsertImageVector } from "./product-vector-upsert-and-query.server";

type AdminGraphql = (
  query: string,
  options?: unknown
) => Promise<{ data: unknown }>;

export async function indexAllProductImages(
  shopId: string,
  adminGraphql: AdminGraphql
): Promise<number> {
  let cursor: string | null = null;
  let indexed = 0;

  do {
    const response = (await adminGraphql(
      `#graphql
      query GetProductImages($cursor: String) {
        products(first: 50, after: $cursor) {
          edges {
            node {
              id
              featuredImage { url }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { variables: { cursor } }
    )) as {
      data: {
        products: {
          edges: { node: { id: string; featuredImage?: { url: string } } }[];
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      };
    };

    const { products } = response.data;

    for (const { node } of products.edges) {
      if (!node.featuredImage?.url) continue;
      const productId = node.id.split("/").pop()!;
      const vector = await embedImage(node.featuredImage.url);
      if (vector) {
        await upsertImageVector(
          shopId,
          productId,
          node.featuredImage.url,
          vector
        );
        indexed++;
      }
    }

    cursor = products.pageInfo.hasNextPage
      ? products.pageInfo.endCursor
      : null;
  } while (cursor);

  return indexed;
}

export async function indexSingleProduct(
  shopId: string,
  productId: string,
  imageUrl: string
): Promise<void> {
  const vector = await embedImage(imageUrl);
  if (vector) await upsertImageVector(shopId, productId, imageUrl, vector);
}
