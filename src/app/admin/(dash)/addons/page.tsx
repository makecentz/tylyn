import { db } from "@/lib/db";
import { deleteAddOn, deleteCollection } from "../../actions";
import { PageTitle } from "../admin-ui";
import { ConfirmSubmit } from "../ConfirmSubmit";
import { AddOnForm, CollectionForm } from "./forms";

export default async function AddOnsPage() {
  const [addOns, collections] = await Promise.all([
    db.addOn.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <PageTitle>Add-ons</PageTitle>
        <p className="-mt-4 text-sm text-mute">Add-ons can be offered on any product. Choose which ones on each product&apos;s page.</p>
        {addOns.map((a) => (
          <div key={a.id} className="card flex flex-col gap-2">
            <AddOnForm addOn={{ id: a.id, name: a.name, price: (a.priceCents / 100).toFixed(2), priceNote: a.priceNote ?? "", active: a.active, sortOrder: a.sortOrder }} />
            <form action={deleteAddOn} className="flex items-center justify-between text-xs text-mute">
              <span>Offered on {a._count.products} product{a._count.products === 1 ? "" : "s"}</span>
              <input type="hidden" name="id" value={a.id} />
              <ConfirmSubmit message={`Delete ${a.name}?`} className="min-h-10 font-semibold text-[#B3124F] underline">Delete</ConfirmSubmit>
            </form>
          </div>
        ))}
        <div className="card flex flex-col gap-2 border-2 border-dashed border-pink">
          <h2 className="font-serif text-lg">New add-on</h2>
          <AddOnForm />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-3xl">Collections</h2>
        <p className="-mt-2 text-sm text-mute">Collections group products in the shop filters and on the home page.</p>
        {collections.map((c) => (
          <div key={c.id} className="card flex flex-col gap-2">
            <CollectionForm collection={{ id: c.id, name: c.name, slug: c.slug, tagline: c.tagline ?? "", sortOrder: c.sortOrder }} />
            <form action={deleteCollection} className="flex items-center justify-between text-xs text-mute">
              <span>{c._count.products} product{c._count.products === 1 ? "" : "s"}</span>
              <input type="hidden" name="id" value={c.id} />
              <ConfirmSubmit message={`Delete the ${c.name} collection? Its products stay but won't be in a collection.`} className="min-h-10 font-semibold text-[#B3124F] underline">Delete</ConfirmSubmit>
            </form>
          </div>
        ))}
        <div className="card flex flex-col gap-2 border-2 border-dashed border-pink">
          <h3 className="font-serif text-lg">New collection</h3>
          <CollectionForm />
        </div>
      </section>
    </div>
  );
}
