/**
 * Cosine similarity, by hand.
 *
 * pgvector's `<=>` operator does exactly this in C, and from step 4 onward the
 * database does it for you. This file exists so the operator is never a black
 * box: it is a dot product divided by two magnitudes, and nothing else.
 *
 *   cos(a, b) = (a · b) / (|a| × |b|)
 *
 * The dot product alone would reward long vectors over relevant ones. Dividing
 * by the magnitudes removes length from the comparison, leaving only direction
 * — and direction is what carries meaning in an embedding space.
 *
 * Result is in [-1, 1]:
 *   1.0   same direction (near-identical meaning)
 *   ~0.8  clearly about the same thing
 *   ~0.5  loosely related
 *   ~0.3  unrelated
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}.`);
  }

  // One pass, three accumulators. Splitting this into dot()/magnitude() calls
  // would read more nicely and walk the arrays three times instead of once.
  let dot = 0;
  let sumSqA = 0;
  let sumSqB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    sumSqA += x * x;
    sumSqB += y * y;
  }

  const denominator = Math.sqrt(sumSqA) * Math.sqrt(sumSqB);
  if (denominator === 0) return 0; // a zero vector has no direction to compare

  return dot / denominator;
}

/**
 * Cosine DISTANCE — what pgvector's `<=>` actually returns.
 *
 * Postgres orders by distance ascending (smallest = nearest) because that is
 * what lets the HNSW index be used. Similarity is just `1 - distance`, which is
 * why lib/rag/search.ts will select `1 - (embedding <=> $1) AS score`.
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/** Euclidean length of a vector. nomic-embed-text does not return unit vectors,
 *  which is exactly why the division in cosineSimilarity cannot be skipped. */
export function magnitude(v: number[]): number {
  let sumSq = 0;
  for (const x of v) sumSq += x * x;
  return Math.sqrt(sumSq);
}
