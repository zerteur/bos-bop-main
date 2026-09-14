import { NextRequest, NextResponse } from "next/server";
import { recordUniqueOpen } from "@/lib/email-tracking";
import { isRateLimited, clientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  if (isRateLimited(`track:${clientIp(request)}`, 100, 10 * 60 * 1000)) {
    return new Response("Too many requests", { status: 429 });
  }

  const url = new URL(request.url);
  const subject = url.searchParams.get("s") || "Email";
  const user = url.searchParams.get("u");

  if (user) {
    await recordUniqueOpen(subject, user);
  }

  // 1x1 transparent GIF
  const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  
  return new Response(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
