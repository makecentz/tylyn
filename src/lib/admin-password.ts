import { db } from "./db";

// A password changed from the admin is stored here and wins over ADMIN_PASSWORD_HASH.
const KEY = "system:admin-password";

export async function getAdminPasswordHash(): Promise<string> {
  const row = await db.siteContent.findUnique({ where: { key: KEY } });
  const stored = (row?.value as { hash?: unknown } | null)?.hash;
  return typeof stored === "string" && stored ? stored : process.env.ADMIN_PASSWORD_HASH ?? "";
}

export async function setAdminPasswordHash(hash: string) {
  const value = { hash, changedAt: new Date().toISOString() };
  await db.siteContent.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
}
