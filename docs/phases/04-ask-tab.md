# Phase 4 — Ask tab (retrieval + generation)

**Goal:** answer rule questions from the corpus, with citations, and refuse what it does
not know.
**AI involved:** retrieval (local) + generation (FreeLLMAPI).
**Effort:** one evening.

---

## 1. What the model actually receives

There is no magic. The prompt is assembled text:

```
Answer using ONLY the context below. Cite the source file.
If the context does not contain the answer, say you don't know.

--- context ---
[salary-income.md] What counts as salary income
Festival bonus received from an employer is treated as salary income and is
fully taxable...

[salary-income.md] Non-cash benefits
...
--- end context ---

Question: Is my festival bonus taxable?
```

The model did not "know" the answer. **You handed it the paragraph and asked it to read.**

---

## 2. The two guards — the whole phase, really

Cosine search **always returns rows**, even when nothing relevant exists. Without guards,
an out-of-scope question gets answered confidently and wrongly.

### Guard 1 — score floor

```ts
const FLOOR = Number(process.env.RETRIEVAL_SCORE_FLOOR ?? 0.5)
if (!hits.length || (hits[0]?.score ?? 0) < FLOOR) {
  return { answer: "I don't have anything on that in the loaded tax rules.", citations: [] }
}
```

**Do not call the model at all.** Cheaper, faster, and cannot hallucinate.

### Guard 2 — prompt instruction

Even above the floor, retrieval can return topically-near-but-wrong chunks. The system
prompt must permit ignorance explicitly.

Use **both**. This is the main thing separating a demo from something another person can
use.

---

## 3. Code

### `lib/llm/client.ts`

```ts
import OpenAI from 'openai'

/** Hosted generation. Public rule text and anonymised values ONLY. */
export const chat = new OpenAI({
  baseURL: process.env.FREELLMAPI_BASE_URL,
  apiKey: process.env.FREELLMAPI_KEY,
})

export const CHAT_MODEL = process.env.CHAT_MODEL ?? 'auto'
```

Add to `.env.local`:
```bash
FREELLMAPI_BASE_URL=http://localhost:3001/v1
FREELLMAPI_KEY=freellmapi-xxxxx
CHAT_MODEL=auto
```

`auto` is fine here — failover across providers costs nothing and generation quality is
carried mostly by the retrieved context. (Embeddings are the opposite: always pinned.)

### `lib/rag/prompt.ts`

```ts
import type { Hit } from './search'

export const SYSTEM_PROMPT = `You are a Bangladesh income tax assistant for individual taxpayers.

Rules you must follow:
- Answer using ONLY the context provided. Never use outside knowledge.
- If the context does not contain the answer, say you do not know and suggest
  consulting a tax professional. Do not guess.
- Never calculate tax amounts. If asked "how much do I owe", tell the user to use
  the Calculate tab.
- Cite the source file(s) you used, in square brackets.
- Answer in the language of the question (Bangla or English).
- Be brief. Two or three sentences is usually enough.`

export function buildContext(hits: Hit[]): string {
  return hits
    .map((h) => `[${h.sourceFile}] ${h.heading ?? ''}\n${h.content}`)
    .join('\n\n')
}

export function buildUserMessage(question: string, hits: Hit[]): string {
  return `--- context ---\n${buildContext(hits)}\n--- end context ---\n\nQuestion: ${question}`
}
```

### `app/api/ask/route.ts`

```ts
import { NextRequest } from 'next/server'
import { search } from '@/lib/rag/search'
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/rag/prompt'
import { chat, CHAT_MODEL } from '@/lib/llm/client'

const FLOOR = Number(process.env.RETRIEVAL_SCORE_FLOOR ?? 0.5)

export async function POST(req: NextRequest) {
  const { question, assessmentYear } = await req.json()

  if (typeof question !== 'string' || question.trim().length < 3) {
    return Response.json({ error: 'question is required' }, { status: 400 })
  }

  const hits = await search(question, assessmentYear ?? null, 5)
  const best = hits[0]?.score ?? 0

  // Guard 1 — nothing relevant. Never reaches the model.
  if (best < FLOOR) {
    return Response.json({
      answer:
        "I don't have anything on that in the loaded tax rules. " +
        'This assistant covers salary, house property and bank interest for resident individuals.',
      citations: [],
      retrieval: { best_score: best, floor: FLOOR, used: false },
    })
  }

  const stream = await chat.chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(question, hits) },
    ],
  })

  const citations = [...new Set(hits.map((h) => h.sourceFile))]

  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      // Send retrieval metadata first so the UI can show sources immediately.
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ citations, scores: hits.map(h => h.score) })}\n\n`))
      for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content
        if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
```

---

## 4. Log every question

Not optional. Without this you cannot tell whether retrieval is working in practice.

```ts
console.log(JSON.stringify({
  at: new Date().toISOString(),
  question,
  assessmentYear,
  best_score: best,
  used_model: best >= FLOOR,
  chunks: hits.map(h => ({ file: h.sourceFile, score: Number(h.score.toFixed(3)) })),
}))
```

Reading a week of these tells you exactly which questions to write corpus for next.

---

## 5. Test these five cases by hand

| Question | Expected |
|---|---|
| "Is festival bonus taxable?" | answers, cites `salary-income.md` |
| "What qualifies for the investment rebate?" | answers, cites `rebate.md` |
| "What documents can I download after filing?" | answers from `shared/` process content |
| **"How much tax do I owe?"** | **redirects to the Calculate tab — does not compute** |
| **"What is the corporate tax rate?"** | **refuses — below the floor, model never called** |

The last two matter most. **If either misbehaves, the phase is not done.**

---

## 6. Tuning the floor

| Symptom | Fix |
|---|---|
| Refuses questions it should answer | lower the floor, or write missing corpus |
| Answers out-of-scope questions | raise the floor |
| Answers are vague | raise `limit` to 6–8, or improve chunking |
| Answers cite the wrong file | chunking problem — Phase 3, not here |

Start at `0.5` and adjust from observed scores. Phase 6 replaces guesswork with a
measured hit rate.

---

## 7. Minimal UI

`app/page.tsx` — a question box, a year selector, streamed answer, and a citations list.
Keep it plain; the Calculate tab in Phase 5 is where the layout work goes.

**Always render the citations.** A cited answer the user can verify is worth far more
than a smarter uncited one — and it is how you contain hallucination risk when running on
free-tier models.

---

## 8. Acceptance criteria

- [ ] Answers cite at least one source file
- [ ] Out-of-scope questions are refused **without calling the model** (check the log)
- [ ] "How much do I owe" redirects to Calculate rather than computing
- [ ] Year filtering works — the 2026-27 selector never returns 2025-26 rule chunks
- [ ] Streaming works end to end
- [ ] Every request is logged with scores

**Only then start Phase 5.**
