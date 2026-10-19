import { db } from "@/lib/db";
import { defaultPartyFields } from "@/lib/custom-fields";
import { PageTitle } from "../../admin-ui";
import { ProductEditor } from "../ProductEditor";

export default async function NewProductPage() {
  const [collections, addOns] = await Promise.all([
    db.collection.findMany({ orderBy: { sortOrder: "asc" } }),
    db.addOn.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <>
      <PageTitle>New product or service</PageTitle>
      <ProductEditor
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
        addOns={addOns.map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents }))}
        initial={{
          name: "", slug: "", kind: "PRODUCT", price: "", priceNote: "", description: "", includes: [], images: [],
          customFields: defaultPartyFields, addOnIds: [], collectionId: collections[0]?.id ?? "", active: true, featured: false,
          onlineCheckout: true, leadDays: 14, sortOrder: 0,
        }}
      />
    </>
  );
}
