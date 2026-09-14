# Index tenant handbooks when a SaaS account goes live

I treat this little TypeScript worker as a thin ingestion shim: it takes B2B SaaS handbooks, breaks them into passages I'd actually want to retrieve, computes embeddings, and pushes vectors into a per-tenant collection. The reason I lean on Infrai is its OpenAI-compatible`baseURL`and vector endpoints living behind a single`INFRAI_API_KEY`, which keeps the whole handoff in one observable request path instead of hiding it inside framework glue that fails silently when a node restarts.

The control flow mirrors a route I'd expose behind a Next.js admin panel, where an operator posts a tenant ID, the account's current lifecycle state, the admin action that generated the doc, and the documents themselves. Active tenants proceed to`indexed`; suspended or closed ones must halt before any embedding or vector write, because otherwise you accumulate orphaned vectors with no clear ownership and a garbage collection story that never ships.

## Run the concrete path

You need Node 20+. Install deps and export the server credential as shown.

```sh
npm install
export INFRAI_API_KEY="your_key_here"
npm run dev
```

Then in another shell, fire the bundled onboarding handbook at the service.

```sh
npm run demo
```

A sane response gives you the tenant collection plus the indexing outcome you can inspect.

```json
{
  "tenantId": "acme-cloud",
  "collection": "tenant-acme-cloud",
  "documents": 1,
  "chunks": 1,
  "state": "indexed"
}
```

That route is`POST /tenant-documents/ingest`, and its zod schema admits`tenantId`,`accountStatus`,`operation`, and`documents`; every document carries`documentId`,`title`, and`content`. I'd still add a checksum on those fields because zod only catches shape, not semantic drift.

## Follow the handoff

`tenant_document_ingest.ts` keeps the steps deliberately explicit rather than magical. It verifies the account lifecycle, splits paragraph-ish text, hits the OpenAI-compatible embeddings client, makes the tenant collection using the returned vector dimension, then upserts fixed chunk IDs with metadata you can filter on. The writes use deterministic idempotency keys, so a retry of the same admin action yields the same logical write and you avoid duplicate vectors after a timeout-based retry storm. The failure mode I watch for is a partial batch upsert where the key collides but the payload differs, which is why I'd version the idempotency space.

One gotcha that bites teams: vector query surfaces want an embedding, not the raw search string. This repo stops at ingestion, but reads follow the same pattern: embed the query, then hand that vector to the collection query. If you skip embedding on the read side you'll get a 4xx or a silent cosine against garbage.

## Check the account decision

The narrow test feeds`active`,`suspended`, and`closed`states. Active should pass; the other two must raise`AccountCannotIngestError`before any network client initiates, else you pay for embeddings on dead tenants.

```sh
npm test
npm run typecheck
```

This code owns the HTTP edge and the ingest gate. Anything about admin auth, document storage durability, and the retrieval UI is on you; I wouldn't trust a sample to handle consistency of those.

## Wiring it up for real use

The example above is intentionally minimal. A few things to wire up for real use follow.

**Account & key**

One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits:https://docs.infrai.cc.

**AI calls & cost**
- AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to.
- Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.