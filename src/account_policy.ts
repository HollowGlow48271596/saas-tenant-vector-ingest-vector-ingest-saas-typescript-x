export type AccountStatus = "active" | "suspended" | "closed";
export type AdminOperation = "tenant_onboarding" | "account_lifecycle" | "admin_operations";

export class AccountCannotIngestError extends Error {
  readonly status: AccountStatus;

  constructor(status: AccountStatus) {
    super(`Documents cannot be ingested while the account is ${status}`);
    this.status = status;
  }
}

export function requireIngestibleAccount(status: AccountStatus): void {
  if (status !== "active") {
    throw new AccountCannotIngestError(status);
  }
}

export function chunkDocument(text: string, maxCharacters = 900): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current && current.length + 2 + paragraph.length > maxCharacters) {
      chunks.push(current);
      current = "";
    }
    if (paragraph.length <= maxCharacters) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    if (current) chunks.push(current);
    for (let start = 0; start < paragraph.length; start += maxCharacters) {
      chunks.push(paragraph.slice(start, start + maxCharacters));
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks;
}
