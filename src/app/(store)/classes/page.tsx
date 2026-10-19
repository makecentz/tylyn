import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const cls = await db.product.findFirst({ where: { active: true, kind: "SERVICE" }, orderBy: { sortOrder: "asc" } });
  redirect(cls ? `/shop/${cls.slug}` : "/shop");
}
