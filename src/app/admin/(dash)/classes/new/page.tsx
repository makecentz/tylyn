import Link from "next/link";
import { db } from "@/lib/db";
import { parseCustomFields } from "@/lib/custom-fields";
import { PageTitle } from "../../admin-ui";
import { ManualClassForm } from "./ManualClassForm";

export default async function NewClassPage() {
  const classes = await db.product.findMany({ where: { kind: "SERVICE" }, orderBy: [{ active: "desc" }, { sortOrder: "asc" }] });
  const options = classes.map((c) => ({
    id: c.id,
    name: c.active ? c.name : `${c.name} (hidden)`,
    price: (c.priceCents / 100).toFixed(2),
    topics: parseCustomFields(c.customFields).find((f) => f.key === "topic")?.options ?? [],
  }));
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/classes" className="text-sm font-semibold text-pink-deep">← All class bookings</Link>
      <PageTitle>Add a class</PageTitle>
      <p className="-mt-4 max-w-2xl text-sm text-mute">
        For classes booked by phone, text or in person. It shows on Class bookings like an online booking. No payment is taken here.
      </p>
      {options.length ? (
        <ManualClassForm classes={options} />
      ) : (
        <div className="card text-sm">
          You don&apos;t have a class to book yet. <Link href="/admin/products/new" className="font-semibold text-pink-deep underline">Add one under Products and services</Link> with the type set to &quot;Service or class&quot;.
        </div>
      )}
    </div>
  );
}
