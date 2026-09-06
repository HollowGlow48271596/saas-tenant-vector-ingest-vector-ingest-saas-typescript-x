import { createHash } from "node:crypto";
import { chunkDocument, requireIngestibleAccount, type AccountStatus, type AdminOperation } from "./account_policy.js";
import { InfraiVectorClient } from "./infrai_vector_client.js";

export type TenantDocument = { documentId: string; title: string; content: string };
export type IngestRequest = {
  tenantId: string;
  accountStatus: AccountStatus;
  operation: AdminOperation;
  documents: TenantDocument[];
};
export type IngestResult = { tenantId: string; collection: string; documents: number; chunks: number; state: "indexed" };

export async function ingestTenantDocuments(request: IngestRequest, client: InfraiVectorClient): Promise<IngestResult> {
  requireIngestibleAccount(request.accountStatus);
  const collection = `tenant-${request.tenantId}`;
  const chunks = request.documents.flatMap((document) =>
    chunkDocument(document.content).map((content, chunkIndex) => ({ document, content, chunkIndex }))
  );
  const embeddings = await client.embed(chunks.map((chunk) => chunk.content));
  const batchIdentity = createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex");

  await client.createCollection(collection, embeddings[0].length, `collection-${collection}`);
  await client.upsert(collection, chunks.map((chunk, index) => ({
    id: `${chunk.document.documentId}:${chunk.chunkIndex}`,
    values: embeddings[index],
    metadata: {
      tenant_id: request.tenantId,
      document_id: chunk.document.documentId,
      title: chunk.document.title,
      operation: request.operation,
      chunk_index: chunk.chunkIndex,
      text: chunk.content
    }
  })), `ingest-${batchIdentity}`);

  return { tenantId: request.tenantId, collection, documents: request.documents.length, chunks: chunks.length, state: "indexed" };
}
