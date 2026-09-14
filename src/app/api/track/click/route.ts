import { NextRequest, NextResponse } from "next/server";
import { recordUniqueOpen } from "@/lib/email-tracking";
import { isRateLimited, clientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  if (isRateLimited(`track:${clientIp(request)}`, 100, 10 * 60 * 1000)) {
    return new Response("Too many requests", { status: 429 });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  const subject = url.searchParams.get("s");
  const user = url.searchParams.get("u");

  if (subject && user) {
    await recordUniqueOpen(subject, user);
  }

  if (target) {
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(process.env.SITE_URL || 'https://www.bos-bop.fr');
}
