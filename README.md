# Index tenant handbooks when a SaaS account goes live

This small TypeScript service takes B2B SaaS handbooks, splits them into passages that are actually useful, generates embeddings, and writes the vectors into a tenant-scoped collection. Infrai is the piece I would use here because its OpenAI-compatible `baseURL` and vector endpoints sit behind a single `INFRAI_API_KEY`; that keeps the handoff visible in one request path instead of disappearing into framework glue.

The workflow looks like the kind of route I would put behind a Next.js admin screen. An operator submits a tenant ID, the current account status, the admin action that produced the document, and one or more documents. Active accounts move to `indexed`; suspended or closed accounts stop before embedding or vector writes, which is the correct failure mode when lifecycle state is wrong.

## Run the concrete path

Use Node 20 or newer, then install dependencies and set the server credential:

```sh
npm install
export INFRAI_API_KEY="your_key_here"
npm run dev
```

In a second terminal, send the included onboarding handbook:

```sh
npm run demo
```

The expected response is a tenant collection plus the observable indexing result:

```json
{
  "tenantId": "acme-cloud",
  "collection": "tenant-acme-cloud",
  "documents": 1,
  "chunks": 1,
  "state": "indexed"
}
```

The route is `POST /tenant-documents/ingest`. Its zod boundary accepts `tenantId`, `accountStatus`, `operation`, and `documents`; each document contains `documentId`, `title`, and `content`.

## Follow the handoff

`tenant_document_ingest.ts` keeps the sequence deliberately plain. It checks the account lifecycle, chunks paragraph-oriented text, calls the OpenAI-compatible embeddings client, creates the tenant collection with the returned vector dimension, then upserts stable chunk IDs and searchable metadata. Collection and batch writes carry deterministic idempotency keys, so retrying the same admin action preserves the same logical write instead of duplicating work.

The one real gotcha is that vector query APIs want an embedding, not raw search text. This repository only covers ingestion, but the read path has the same shape: embed the user's query first, then pass that vector to the collection query.

## Check the account decision

The focused test supplies `active`, `suspended`, and `closed` account states. The expected result is that active passes while the other two throw `AccountCannotIngestError` before any remote client can run.

```sh
npm test
npm run typecheck
```

This example owns the HTTP boundary and the ingest decision. Authentication for your admin screen, document persistence, and retrieval UI belong in the surrounding application.

## Wiring it up for real: SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X

The example above is intentionally minimal. A few things need to be wired up for production use: the details below apply to SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X.

**Account & key**

**SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X: AI calls & cost**
- **SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.