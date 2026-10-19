import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { Flash, PageTitle } from "../admin-ui";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const products = await db.product.findMany({
    include: { collection: true },
    orderBy: [{ collection: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  return (
    <>
      <PageTitle actions={<Link href="/admin/products/new" className="btn btn-pink">+ Add product or service</Link>}>Products and services</PageTitle>
      <Flash message={deleted ? "Product deleted." : undefined} />
      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-mute">
              <th scope="col" className="px-5 py-4 font-semibold">Product</th>
              <th scope="col" className="px-3 py-4 font-semibold">Collection</th>
              <th scope="col" className="px-3 py-4 font-semibold">Price</th>
              <th scope="col" className="px-5 py-4 font-semibold">Visibility</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-[#F0E7EB] hover:bg-blush">
                <td className="px-5 py-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold underline">
                    {p.images[0] ? (
                      <Image src={p.images[0]} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-cover object-top" />
                    ) : (
                      <span className="h-12 w-12 rounded-lg bg-[#FFE3F1]" />
                    )}
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-3 text-[#4A3F45]">{p.collection?.name ?? "—"}</td>
                <td className="px-3 py-3">{p.priceCents ? formatCents(p.priceCents) : <span className="text-[#B3124F]">Not set</span>}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                    {p.active ? <span className="rounded-full bg-[#D9F5E6] px-2.5 py-1 text-[#0F5132]">In shop</span> : <span className="rounded-full bg-[#EEEAEC] px-2.5 py-1 text-[#4A3F45]">Hidden</span>}
                    {p.active && !p.onlineCheckout ? <span className="rounded-full bg-[#FFF1C7] px-2.5 py-1 text-[#5C4500]">Inquiry only</span> : null}
                    {p.featured ? <span className="rounded-full bg-ink px-2.5 py-1 text-gold">Featured</span> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
