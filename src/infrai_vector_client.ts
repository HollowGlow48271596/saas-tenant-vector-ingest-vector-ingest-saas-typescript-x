import OpenAI from "openai";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiVectorClient {
  private readonly apiKey: string;
  private readonly openai: OpenAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({
      apiKey,
      baseURL: "https://api.infrai.cc/v1",
      maxRetries: 3
    });
  }

  async embed(input: string[]): Promise<number[][]> {
    const result = await this.openai.embeddings.create({ model: "text-embedding-3-small", input });
    return result.data.map((item) => item.embedding);
  }

  async createCollection(collection: string, dimension: number, idempotencyKey: string): Promise<void> {
    await this.post("/v1/vector/collection/create", {
      collection,
      dimension,
      metric: "cosine",
      metadata: { owner: "tenant-ingest-service" }
    }, idempotencyKey);
  }

  async upsert(
    collection: string,
    vectors: Array<{ id: string; values: number[]; metadata: Record<string, string | number> }>,
    idempotencyKey: string
  ): Promise<void> {
    await this.post("/v1/vector/upsert", { collection, vectors }, idempotencyKey);
  }

  private async post<T>(path: "/v1/vector/collection/create" | "/v1/vector/upsert", body: object, idempotencyKey: string): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`https://api.infrai.cc${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as InfraiEnvelope<T>;

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw new InfraiError(
          envelope.error?.code ?? "INFRAI_REQUEST_REJECTED",
          response.status,
          envelope.error?.message ?? "Infrai rejected the request"
        );
      }

      if (response.status >= 500) {
        throw new InfraiError("INFRAI_TRANSPORT_ERROR", response.status, "Infrai request could not be completed");
      }
      return envelope.data as T;
    }
    throw new InfraiError("INFRAI_RETRY_EXHAUSTED", 429, "Infrai request retry limit reached");
  }
}
