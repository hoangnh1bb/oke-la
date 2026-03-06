// Text embeddings via OpenAI API (1536-dim) and image embeddings via CLIP (512-dim)
// Falls back to deterministic pseudo-random vector when OPENAI_API_KEY is absent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { pipeline, env } from "@huggingface/transformers";

// Configure transformers.js cache directory
(env as any).cacheDir = "./.cache/transformers";

// CLIP pipeline singleton — lazy-loaded on first image embed request
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _clipPipeline: any = null;

async function getClipPipeline() {
  if (!_clipPipeline) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _clipPipeline = await (pipeline as any)(
      "feature-extraction",
      "Xenova/clip-vit-base-patch32",
      { revision: "main" }
    );
  }
  return _clipPipeline;
}

// Text embeddings via OpenAI text-embedding-3-small (1536-dim)
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Dev fallback: deterministic pseudo-random normalized vector
    return generateDevEmbedding(text, 1536);
  }
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI embeddings error: ${err}`);
  }
  const responseData = (await resp.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return responseData.data[0].embedding;
}

// Image embeddings via HuggingFace CLIP clip-vit-base-patch32 (512-dim)
export async function embedImage(imageUrl: string): Promise<number[] | null> {
  try {
    const pipe = await getClipPipeline();
    const result = await (pipe as any)(imageUrl, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(result.data) as number[];
  } catch (err) {
    console.error("[SmartRec] embedImage failed for", imageUrl, ":", err);
    return null;
  }
}

// Deterministic pseudo-random normalized vector for dev/test (no API key needed)
function generateDevEmbedding(text: string, dims: number): number[] {
  let seed = 0;
  for (let i = 0; i < text.length; i++)
    seed = (seed * 31 + text.charCodeAt(i)) | 0;
  const vec: number[] = [];
  for (let i = 0; i < dims; i++) {
    seed = (seed * 1664525 + 1013904223) | 0;
    vec.push(((seed >>> 0) / 0xffffffff) * 2 - 1);
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? vec : vec.map((v) => v / mag);
}
