// Generates quiz questions and price buckets by analyzing the shop's product catalog
// Auto-detects product types, tags, and price distribution to build a personalization quiz
export interface PriceBucket {
  label: string;
  min: number;
  max: number | null;
}

export interface QuizQuestion {
  id: "category" | "budget" | "preference";
  label: string;
  type: "single" | "multi";
  options: Array<{ label: string; value: string; count: number }>;
}

export interface QuizConfig {
  enabled: boolean;
  generatedAt: string;
  questions: QuizQuestion[];
  priceBuckets: PriceBucket[];
}

export interface ShopifyProductSummary {
  productType?: string;
  tags?: string[];
  priceRangeV2?: { minVariantPrice?: { amount?: string } };
}

function countBy<T>(arr: T[], key: (x: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of arr) {
    const k = key(x);
    if (k) m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function topN(counts: Map<string, number>, n: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, value: label, count }));
}

function computePriceBuckets(prices: number[]): PriceBucket[] {
  if (prices.length === 0) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = max - min;
  if (spread < 10) return []; // < $10 spread — skip budget question

  const step = Math.ceil(spread / 4);
  return [
    { label: `Under $${Math.round(min + step)}`, min: 0, max: min + step },
    {
      label: `$${Math.round(min + step)}–$${Math.round(min + 2 * step)}`,
      min: min + step,
      max: min + 2 * step,
    },
    {
      label: `$${Math.round(min + 2 * step)}–$${Math.round(min + 3 * step)}`,
      min: min + 2 * step,
      max: min + 3 * step,
    },
    {
      label: `Over $${Math.round(min + 3 * step)}`,
      min: min + 3 * step,
      max: null,
    },
  ];
}

export async function generateQuizConfig(
  products: ShopifyProductSummary[]
): Promise<QuizConfig> {
  const types = topN(
    countBy(products, (p) => p.productType || ""),
    6
  ).filter((t) => t.label && t.label !== "Other");

  const allTags = products.flatMap((p) => p.tags || []);
  const tags = topN(countBy(allTags, (t) => t), 8).filter((t) => t.label);

  const prices = products
    .map((p) =>
      parseFloat(p.priceRangeV2?.minVariantPrice?.amount || "0")
    )
    .filter((p) => p > 0);
  const priceBuckets = computePriceBuckets(prices);

  const questions: QuizQuestion[] = [];

  if (types.length >= 3) {
    questions.push({
      id: "category",
      label: "What are you looking for?",
      type: "single",
      options: types.slice(0, 6),
    });
  }

  if (priceBuckets.length >= 2) {
    questions.push({
      id: "budget",
      label: "What's your budget?",
      type: "single",
      options: priceBuckets.map((b) => ({
        label: b.label,
        value: b.label,
        count: 0,
      })),
    });
  }

  if (tags.length >= 4) {
    questions.push({
      id: "preference",
      label: "Any preferences?",
      type: "multi",
      options: tags.slice(0, 6),
    });
  }

  return {
    enabled: questions.length >= 2,
    generatedAt: new Date().toISOString(),
    questions,
    priceBuckets,
  };
}
