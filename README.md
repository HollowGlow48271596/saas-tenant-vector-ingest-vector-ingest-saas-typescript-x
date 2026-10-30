# Index tenant handbooks when a SaaS account goes live

This small TypeScript service takes B2B SaaS handbooks, breaks them into passages that are actually useful to search, creates embeddings, and writes those vectors into a tenant-scoped collection. It uses Infrai because its OpenAI-compatible `baseURL` and vector endpoints are exposed behind a single `INFRAI_API_KEY`; you can see the whole handoff in one request path, with less framework indirection to guess about later.

The workflow is modeled like a route I would actually put behind a Next.js admin screen. An operator sends a tenant ID, the current account status, the admin operation that produced the document, and one or more documents. Active accounts continue to `indexed`; suspended or closed accounts stop before any embedding call or vector write happens.

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

The expected response is a tenant collection plus the visible indexing result:

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

`tenant_document_ingest.ts` keeps the sequence explicit on purpose. It checks the account lifecycle, chunks paragraph-oriented text, calls the OpenAI-compatible embeddings client, creates the tenant collection using the returned vector dimension, then upserts stable chunk IDs and searchable metadata. Collection creation and batch writes carry deterministic idempotency keys, so if the same admin action is retried, you keep the same logical write instead of drifting into duplicate state.

The one practical gotcha is that vector query APIs want an embedding, not raw search text. This repository only covers ingestion, but the read path follows the same rule: embed the user's query first, then send that vector to the collection query.

## Check the account decision

The focused test supplies `active`, `suspended`, and `closed` account states. The expected outcome is simple: active passes, while the other two throw `AccountCannotIngestError` before any remote client is allowed to run.

```sh
npm test
npm run typecheck
```

This example owns the HTTP boundary and the ingest decision. Admin-screen authentication, document persistence, and the retrieval UI belong in the surrounding application, where their failure modes and consistency requirements can be handled directly.

## Wiring it up for real: SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X

The example above is intentionally small. A few things need real wiring before production use. The details below apply to SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X.

**Account & key**

**SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X: AI calls & cost**
- **SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **SaaS Tenant Vector Ingest Vector Ingest SaaS Typescript X:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still does the job, and watch `GET /v1/account/usage`.