import Image from "next/image";
import type { Metadata } from "next";
import { getAllContent } from "@/lib/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const { gallery, contact } = await getAllContent();
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pb-24 pt-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-script text-4xl text-pink-deep">Made with love</span>
          <h1 className="font-serif text-5xl">Gallery</h1>
        </div>
        {contact.instagram ? (
          <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noreferrer" className="font-semibold text-pink-deep underline">
            More on Instagram @{contact.instagram}
          </a>
        ) : null}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {gallery.images.map((g, i) => (
          <figure key={g.src + i} className="relative aspect-square overflow-hidden rounded-[14px] bg-ink">
            <Image src={g.src} alt={g.alt} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
          </figure>
        ))}
      </div>
    </div>
  );
}
