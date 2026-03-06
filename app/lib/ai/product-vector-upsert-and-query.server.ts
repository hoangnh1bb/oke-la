// Vector upsert/delete via Prisma (storage) and similarity query via cosine similarity
import prisma from "../../db.server";
import {
  queryNearestTextVectors,
  queryNearestImageVectors,
} from "./vector-cosine-similarity-sqlite.server";

export async function upsertTextVector(
  shopId: string,
  productId: string,
  vector: number[]
): Promise<void> {
  const v = JSON.stringify(vector);
  await prisma.productEmbedding.upsert({
    where: { shopId_productId: { shopId, productId } },
    create: { shopId, productId, vector: v },
    update: { vector: v },
  });
}

export async function upsertImageVector(
  shopId: string,
  productId: string,
  imageUrl: string,
  vector: number[]
): Promise<void> {
  const v = JSON.stringify(vector);
  await prisma.productImageEmbedding.upsert({
    where: { shopId_productId: { shopId, productId } },
    create: { shopId, productId, imageUrl, vector: v },
    update: { imageUrl, vector: v },
  });
}

export async function queryNearestText(
  shopId: string,
  queryVector: number[],
  k: number
): Promise<Array<{ productId: string; similarity: number }>> {
  return queryNearestTextVectors(shopId, queryVector, k);
}

export async function queryNearestImage(
  shopId: string,
  queryVector: number[],
  k: number
): Promise<Array<{ productId: string; similarity: number }>> {
  return queryNearestImageVectors(shopId, queryVector, k);
}

export async function deleteProductVectors(
  shopId: string,
  productId: string
): Promise<void> {
  await Promise.all([
    prisma.productEmbedding.deleteMany({ where: { shopId, productId } }),
    prisma.productImageEmbedding.deleteMany({ where: { shopId, productId } }),
  ]);
}
