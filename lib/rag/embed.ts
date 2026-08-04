import OpenAI from 'openai';

/**
 * Turn text into a vector.
 *
 * Runs against Ollama on this machine. That is not a convenience — personal tax
 * figures must never reach a hosted provider whose terms may allow training on
 * inputs. Only public rule text and anonymised derived values go to FreeLLMAPI
 * later (Phase 4).
 *
 * Ollama exposes an OpenAI-compatible endpoint, so the same SDK serves both.
 */
const embedder = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: 'ollama', // required by the SDK, ignored by Ollama
});

/**
 * WARNING: this is a hard contract with the database.
 * nomic-embed-text = 768 dimensions, and db/schema.sql declares vector(768).
 * Changing this requires a schema migration AND a full re-index.
 */
export const MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text';

/** Dimensions the schema is locked to. Asserted on every call — a silent
 *  model swap would otherwise fail much later, at INSERT time. */
export const DIMENSIONS = 768;

/** Embed one string. Throws with a usable message if Ollama is not reachable. */
export async function embed(text: string): Promise<number[]> {
  let res;
  try {
    res = await embedder.embeddings.create({ model: MODEL, input: text });
  } catch (cause) {
    throw new Error(
      `Embedding failed — is Ollama running? Try: ollama serve\n` +
        `  model: ${MODEL}\n  url:   ${embedder.baseURL}`,
      { cause },
    );
  }

  const vec = res.data[0]?.embedding;
  if (!vec) throw new Error(`Embedding request returned no vector (model: ${MODEL}).`);

  if (vec.length !== DIMENSIONS) {
    throw new Error(
      `Expected ${DIMENSIONS} dimensions, got ${vec.length}. ` +
        `EMBED_MODEL is "${MODEL}" — db/schema.sql is locked to vector(${DIMENSIONS}).`,
    );
  }

  return vec;
}

/** Embed many strings. Sequential on purpose: local model, no rate limit to
 *  work around, and a readable progress order matters more than speed here. */
export async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) out.push(await embed(t));
  return out;
}
