/**
 * API proxy — PORTED from V1 (the request spine, kept by design) with two
 * Phase 5 additions:
 *  1. Origin/Host check on mutating requests (CSRF hardening for the
 *     cookie-bearing auth endpoints).
 *  2. Cookie + Set-Cookie passthrough so the httpOnly refresh-token flow
 *     works through the proxy.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARDED_REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "cookie",
  "user-agent",
  "x-request-id",
];

const STRIPPED_RESPONSE_HEADERS = [
  "connection",
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "set-cookie", // re-appended explicitly below
];

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function getBackendBaseUrl(): string {
  const backendUrl =
    process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";
  return backendUrl.trim().replace(/\/+$/, "");
}

function originAllowed(request: NextRequest): boolean {
  if (!MUTATING_METHODS.has(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, server-side)
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

async function proxyRequest(request: NextRequest, path: string[]) {
  if (!originAllowed(request)) {
    return NextResponse.json({ detail: "Cross-origin request rejected." }, { status: 403 });
  }

  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json({ detail: "Backend API URL is missing." }, { status: 500 });
  }

  const search = request.nextUrl.search || "";
  const targetUrl = `${backendBaseUrl}/${path.join("/")}${search}`;

  const headers = new Headers();
  FORWARDED_REQUEST_HEADERS.forEach((headerName) => {
    const value = request.headers.get(headerName);
    if (value) headers.set(headerName, value);
  });
  headers.set("x-forwarded-for", request.headers.get("x-forwarded-for") ?? "");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  STRIPPED_RESPONSE_HEADERS.forEach((headerName) => responseHeaders.delete(headerName));

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });

  // Set-Cookie must be appended one-by-one (Headers folds it otherwise)
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
