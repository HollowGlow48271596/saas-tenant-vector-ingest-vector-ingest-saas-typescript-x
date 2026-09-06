import { createServer } from "node:http";
import { z } from "zod";
import { AccountCannotIngestError } from "./account_policy.js";
import { InfraiError, InfraiVectorClient } from "./infrai_vector_client.js";
import { ingestTenantDocuments, type IngestRequest } from "./tenant_document_ingest.js";

const bodySchema = z.object({
  tenantId: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/),
  accountStatus: z.enum(["active", "suspended", "closed"]),
  operation: z.enum(["tenant_onboarding", "account_lifecycle", "admin_operations"]),
  documents: z.array(z.object({
    documentId: z.string().min(1),
    title: z.string().min(1),
    content: z.string().trim().min(1)
  })).min(1)
});

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const client = new InfraiVectorClient(apiKey);

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/tenant-documents/ingest") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const parts: Buffer[] = [];
    for await (const part of request) parts.push(Buffer.from(part));
    const input = bodySchema.parse(
      JSON.parse(Buffer.concat(parts).toString("utf8"))
    ) as IngestRequest;
    sendJson(response, 200, await ingestTenantDocuments(input, client));
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(response, 400, { error: "Invalid request body", issues: error.issues });
    } else if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Request body must be valid JSON" });
    } else if (error instanceof AccountCannotIngestError) {
      sendJson(response, 409, { error: error.message, accountStatus: error.status });
    } else if (error instanceof InfraiError) {
      sendJson(response, error.status >= 400 && error.status < 500 ? error.status : 502, { error: error.message, code: error.code });
    } else {
      sendJson(response, 500, { error: "Request could not be processed" });
    }
  }
}).listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Tenant ingest service listening on http://localhost:${process.env.PORT ?? 3000}`);
});
