import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { favorsField, parseCustomFields } from "@/lib/custom-fields";
import { Flash, PageTitle } from "../admin-ui";
import { ProductsTable } from "./ProductsTable";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const [products, collections] = await Promise.all([
    db.product.findMany({
      include: { collection: true },
      orderBy: [{ collection: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.images[0],
    collection: p.collection?.name ?? null,
    price: favorsField(parseCustomFields(p.customFields)) ? "Per favor" : p.priceCents ? formatCents(p.priceCents) : null,
    active: p.active,
    onlineCheckout: p.onlineCheckout,
    featured: p.featured,
  }));
  return (
    <>
      <PageTitle actions={<Link href="/admin/products/new" className="btn btn-pink">+ Add product or service</Link>}>Products and services</PageTitle>
      <Flash message={deleted ? "Product deleted." : undefined} />
      <ProductsTable rows={rows} collections={collections} />
    </>
  );
}
