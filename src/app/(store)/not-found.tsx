import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[700px] flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <span className="font-script text-5xl text-pink">Oops!</span>
      <h1 className="font-serif text-4xl">We couldn&apos;t find that page.</h1>
      <Link href="/shop" className="btn btn-pink">Go to the shop</Link>
    </div>
  );
}
