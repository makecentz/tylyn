import { NextResponse, type NextRequest } from "next/server";

/** Only same-site paths, so a crafted link can't bounce a shopper to another site after signing in. */
export function safeNext(value: FormDataEntryValue | null) {
  const v = String(value ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/account";
}

export function redirectTo(req: NextRequest, path: string, params: Record<string, string> = {}, hash = "") {
  const url = new URL(path, req.url);
  url.hash = hash;
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return NextResponse.redirect(url, 303);
}
