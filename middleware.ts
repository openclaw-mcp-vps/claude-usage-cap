import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionFromCookie, SESSION_COOKIE } from "@/lib/auth";

const AUTH_REQUIRED_PREFIXES = ["/dashboard", "/projects", "/api/projects", "/api/usage"];
const PAID_REQUIRED_PREFIXES = ["/projects", "/api/projects", "/api/usage"];

function pathStartsWith(pathname: string, candidates: string[]) {
  return candidates.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathStartsWith(pathname, AUTH_REQUIRED_PREFIXES)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionFromCookie(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL("/", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (pathStartsWith(pathname, PAID_REQUIRED_PREFIXES) && !session.paid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Payment required" }, { status: 402 });
    }

    const url = new URL("/dashboard", request.url);
    url.searchParams.set("billing", "required");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/api/projects/:path*", "/api/usage/:path*"]
};
