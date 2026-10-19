import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

export class UploadError extends Error {}

/** Stores an image and returns its public URL. Uses Vercel Blob when configured, otherwise public/uploads (dev only). */
export async function saveImage(file: File, folder: "products" | "content" | "customer"): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new UploadError("Please upload a JPG, PNG, WEBP, GIF or HEIC image.");
  if (file.size > MAX_BYTES) throw new UploadError("Images must be 8 MB or smaller.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const name = `${folder}/${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, file, { access: "public", contentType: file.type });
    return blob.url;
  }
  if (process.env.NODE_ENV === "production") {
    throw new UploadError("Image uploads are not set up yet (missing BLOB_READ_WRITE_TOKEN).");
  }
  const dest = path.join(process.cwd(), "public", "uploads", name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}
