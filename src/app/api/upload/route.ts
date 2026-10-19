import { NextResponse } from "next/server";
import { UploadError, saveImage } from "@/lib/upload";

/** Customer photo uploads from product pages. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  try {
    const url = await saveImage(file, "customer");
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
