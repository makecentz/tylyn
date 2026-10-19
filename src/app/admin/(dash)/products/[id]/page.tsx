import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseCustomFields } from "@/lib/custom-fields";
import { deleteProduct } from "../../../actions";
import { Flash, PageTitle } from "../../admin-ui";
import { ConfirmSubmit } from "../../ConfirmSubmit";
import { ProductEditor } from "../ProductEditor";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const [product, collections, addOns, orderCount] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { addOns: true } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" } }),
    db.addOn.findMany({ orderBy: { sortOrder: "asc" } }),
    db.orderItem.count({ where: { productId: id } }),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageTitle>Edit: {product.name}</PageTitle>
      <Flash message={saved ? "Saved. Changes are live on the site." : undefined} />
      <ProductEditor
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
        addOns={addOns.map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents }))}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          kind: product.kind,
          price: (product.priceCents / 100).toFixed(2),
          priceNote: product.priceNote ?? "",
          description: product.description,
          includes: product.includes,
          images: product.images,
          customFields: parseCustomFields(product.customFields),
          addOnIds: product.addOns.map((a) => a.id),
          collectionId: product.collectionId ?? "",
          active: product.active,
          featured: product.featured,
          onlineCheckout: product.onlineCheckout,
          leadDays: product.leadDays,
          sortOrder: product.sortOrder,
        }}
      />
      <form action={deleteProduct} className="mt-10 border-t border-line pt-6">
        <input type="hidden" name="id" value={product.id} />
        <p className="mb-3 text-sm text-mute">
          {orderCount > 0
            ? `This product is on ${orderCount} past order${orderCount === 1 ? "" : "s"}. Those orders keep their details if you delete it, but hiding it is usually better.`
            : "Deleting removes this product from the shop for good."}
        </p>
        <ConfirmSubmit message={`Delete ${product.name}? This can't be undone.`} className="btn min-h-11 border-[1.5px] border-[#B3124F] bg-white text-[#B3124F]">Delete product</ConfirmSubmit>
      </form>
    </>
  );
}
