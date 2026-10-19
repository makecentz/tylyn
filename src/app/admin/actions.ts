"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ClassStatus, OrderStatus, ProductKind, QuoteStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { classStatuses } from "@/lib/classes";
import { saveContent, type ContentKey, type SiteContentMap } from "@/lib/content";
import { customFieldSchema } from "@/lib/custom-fields";
import { db } from "@/lib/db";
import { parseDollars } from "@/lib/money";
import { money, square, squareConfigured, squareErrorMessage } from "@/lib/square";
import { UploadError, saveImage } from "@/lib/upload";

/* ---------- Orders ---------- */

const statuses = ["NEW", "PROOF_SENT", "IN_PRODUCTION", "READY", "SHIPPED", "COMPLETED", "CANCELLED"] as const;

export async function updateOrder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as OrderStatus;
  if (!statuses.includes(status as (typeof statuses)[number])) throw new Error("Invalid status");
  await db.order.update({
    where: { id },
    data: { status, adminNotes: String(formData.get("adminNotes") ?? "").slice(0, 5000) || null },
  });
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${id}?saved=1`);
}

export async function updateClassBooking(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  let classStatus = String(formData.get("classStatus")) as ClassStatus;
  if (!classStatuses.includes(classStatus as (typeof classStatuses)[number])) throw new Error("Invalid status");
  const date = String(formData.get("classDate") ?? "");
  const time = String(formData.get("classTime") ?? "");
  const classDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
  // Picking a date is scheduling the class, even if the status menu was left alone.
  if (classDate && classStatus === "REQUESTED") classStatus = "SCHEDULED";
  await db.order.update({
    where: { id },
    data: {
      classStatus,
      classDate,
      classTime: /^\d{2}:\d{2}$/.test(time) ? time : null,
      classLocation: String(formData.get("classLocation") ?? "").trim().slice(0, 300) || null,
      ...(formData.has("adminNotes") ? { adminNotes: String(formData.get("adminNotes")).slice(0, 5000) || null } : {}),
    },
  });
  revalidatePath("/admin/classes");
  redirect(`/admin/orders/${id}?saved=1`);
}

export async function refundOrder(_prev: { error?: string; ok?: string } | null, formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const order = await db.order.findUnique({ where: { id } });
  if (!order?.squarePaymentId) return { error: "This order has no Square payment to refund." };
  const cents = parseDollars(String(formData.get("amount") ?? ""));
  const remaining = order.totalCents - order.refundedCents;
  if (!cents || cents <= 0) return { error: "Enter a refund amount." };
  if (cents > remaining) return { error: `You can refund at most $${(remaining / 100).toFixed(2)}.` };
  if (!squareConfigured()) return { error: "Square isn't configured." };
  try {
    await square().refunds.refundPayment({
      idempotencyKey: randomUUID(),
      paymentId: order.squarePaymentId,
      amountMoney: money(cents),
      reason: String(formData.get("reason") ?? "").slice(0, 192) || "Refund from Tylyn Tingz Creations",
    });
  } catch (e) {
    return { error: squareErrorMessage(e) };
  }
  const refundedCents = order.refundedCents + cents;
  await db.order.update({
    where: { id },
    data: { refundedCents, paymentStatus: refundedCents >= order.totalCents ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: `Refunded $${(cents / 100).toFixed(2)} through Square.` };
}

/* ---------- Quote requests ---------- */

const quoteStatuses = ["NEW", "CONTACTED", "BOOKED", "CLOSED"] as const;

export async function updateQuote(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as QuoteStatus;
  if (!quoteStatuses.includes(status as (typeof quoteStatuses)[number])) throw new Error("Invalid status");
  await db.quoteRequest.update({
    where: { id },
    data: { status, adminNotes: String(formData.get("adminNotes") ?? "").slice(0, 5000) || null },
  });
  revalidatePath("/admin/quotes");
  const back = encodeURIComponent(String(formData.get("back") ?? "open"));
  redirect(`/admin/quotes?status=${back}&saved=1`);
}

/* ---------- Images ---------- */

export async function uploadAdminImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file received." };
  try {
    return { url: await saveImage(file, "products") };
  } catch (e) {
    return { error: e instanceof UploadError ? e.message : "Upload failed." };
  }
}

/* ---------- Products ---------- */

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The web address can only use lowercase letters, numbers and dashes."),
  kind: z.enum(["PRODUCT", "SERVICE"]),
  price: z.string(),
  priceNote: z.string().max(40).optional(),
  description: z.string().max(5000),
  includes: z.array(z.string().trim().min(1).max(200)).max(40),
  images: z.array(z.string().min(1)).max(12),
  customFields: z.array(customFieldSchema).max(20),
  addOnIds: z.array(z.string()),
  collectionId: z.string().optional(),
  active: z.boolean(),
  featured: z.boolean(),
  onlineCheckout: z.boolean(),
  leadDays: z.number().int().min(0).max(365),
  sortOrder: z.number().int(),
});

export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(input: ProductInput): Promise<{ error?: string; id?: string }> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const p = parsed.data;
  const priceCents = parseDollars(p.price);
  if (priceCents === null) return { error: "Enter a price like 125 or 125.00." };
  if (p.onlineCheckout && p.active && priceCents === 0) return { error: "Set a price before turning on online checkout." };
  const keys = new Set<string>();
  for (const f of p.customFields) {
    if (keys.has(f.key)) return { error: `Two customer questions share the label "${f.label}". Please rename one.` };
    keys.add(f.key);
  }

  const clash = await db.product.findFirst({ where: { slug: p.slug, NOT: p.id ? { id: p.id } : undefined } });
  if (clash) return { error: "Another product already uses that web address." };

  const data = {
    name: p.name,
    slug: p.slug,
    kind: p.kind as ProductKind,
    priceCents,
    priceNote: p.priceNote?.trim() || null,
    description: p.description,
    includes: p.includes,
    images: p.images,
    customFields: p.customFields,
    active: p.active,
    featured: p.featured,
    onlineCheckout: p.onlineCheckout,
    leadDays: p.leadDays,
    sortOrder: p.sortOrder,
    collectionId: p.collectionId || null,
  };
  const saved = p.id
    ? await db.product.update({ where: { id: p.id }, data: { ...data, addOns: { set: p.addOnIds.map((id) => ({ id })) } } })
    : await db.product.create({ data: { ...data, addOns: { connect: p.addOnIds.map((id) => ({ id })) } } });
  revalidatePath("/", "layout");
  return { id: saved.id };
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  await db.product.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/admin/products?deleted=1");
}

/* ---------- Add-ons and collections ---------- */

export async function saveAddOn(_prev: { error?: string; ok?: string } | null, formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const priceCents = parseDollars(String(formData.get("price") ?? ""));
  if (!name) return { error: "Name is required." };
  if (priceCents === null) return { error: "Enter a price like 25 or 25.00." };
  const data = {
    name,
    priceCents,
    priceNote: String(formData.get("priceNote") ?? "").trim() || null,
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
  if (id) await db.addOn.update({ where: { id }, data });
  else await db.addOn.create({ data });
  revalidatePath("/", "layout");
  return { ok: `Saved ${name}.` };
}

export async function deleteAddOn(formData: FormData) {
  await requireAdmin();
  await db.addOn.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
}

export async function saveCollection(_prev: { error?: string; ok?: string } | null, formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };
  const slug =
    String(formData.get("slug") ?? "").trim() ||
    name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const data = {
    name,
    slug,
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
  const clash = await db.collection.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { error: "Another collection already uses that name." };
  if (id) await db.collection.update({ where: { id }, data });
  else await db.collection.create({ data });
  revalidatePath("/", "layout");
  return { ok: `Saved ${name}.` };
}

export async function deleteCollection(formData: FormData) {
  await requireAdmin();
  await db.collection.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
}

/* ---------- Site content ---------- */

export async function saveContentSection<K extends ContentKey>(key: K, value: SiteContentMap[K]): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  try {
    await saveContent(key, value);
  } catch (e) {
    console.error(e);
    return { error: "Couldn't save. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
