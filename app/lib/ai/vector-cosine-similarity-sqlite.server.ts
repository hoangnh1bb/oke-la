// Vector database operations using better-sqlite3 (alongside Prisma)
// Cosine similarity computed in JS over JSON-stored vectors
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "prisma/dev.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var sqliteVecDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (global.sqliteVecDb) return global.sqliteVecDb;
  const db = new Database(DB_PATH);
  global.sqliteVecDb = db;
  return db;
}

export function queryNearestTextVectors(
  shopId: string,
  queryVector: number[],
  k: number
): Array<{ productId: string; similarity: number }> {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT productId, vector FROM smartrec_product_embeddings WHERE shopId = ?"
    )
    .all(shopId) as Array<{ productId: string; vector: string }>;

  return rows
    .map((r) => ({
      productId: r.productId,
      similarity: cosineSimilarity(queryVector, JSON.parse(r.vector)),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

export function queryNearestImageVectors(
  shopId: string,
  queryVector: number[],
  k: number
): Array<{ productId: string; similarity: number }> {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT productId, vector FROM smartrec_product_image_embeddings WHERE shopId = ?"
    )
    .all(shopId) as Array<{ productId: string; vector: string }>;

  return rows
    .map((r) => ({
      productId: r.productId,
      similarity: cosineSimilarity(queryVector, JSON.parse(r.vector)),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}
