import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const protocol = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol;

  // 1. Force HTTPS and WWW pour le SEO (sauf en local)
  if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
    let needsRedirect = false;
    const newUrl = new URL(request.url);

    if (protocol === "http:" || protocol === "http") {
      newUrl.protocol = "https:";
      needsRedirect = true;
    }

    if (host === "bos-bop.fr") {
      newUrl.host = "www.bos-bop.fr";
      needsRedirect = true;
    }

    if (needsRedirect) {
      return NextResponse.redirect(newUrl, 301);
    }
  }

  // 2. Protection de l'administration
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();

    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|assets|js|css|images|favicon.ico).*)"],
};
