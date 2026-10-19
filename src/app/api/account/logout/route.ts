import type { NextRequest } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { redirectTo } from "../shared";

export async function POST(req: NextRequest) {
  const res = redirectTo(req, "/");
  res.cookies.delete(CUSTOMER_COOKIE);
  return res;
}
