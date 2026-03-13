import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARDED_REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "x-cashfree-signature",
  "x-cashfree-timestamp",
];

const STRIPPED_RESPONSE_HEADERS = [
  "connection",
  "content-length",
  "content-encoding",
  "transfer-encoding",
];

function getBackendBaseUrl() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";
  return backendUrl.trim().replace(/\/+$/, "");
}

function buildTargetUrl(request: NextRequest, path: string[]) {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    throw new Error("Backend API URL is missing.");
  }

  const joinedPath = path.join("/");
  const search = request.nextUrl.search || "";
  return `${backendBaseUrl}/${joinedPath}${search}`;
}

async function proxyRequest(request: NextRequest, path: string[]) {
  const targetUrl = buildTargetUrl(request, path);
  const headers = new Headers();

  FORWARDED_REQUEST_HEADERS.forEach((headerName) => {
    const value = request.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  });

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstream.headers);
  STRIPPED_RESPONSE_HEADERS.forEach((headerName) => responseHeaders.delete(headerName));

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

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

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
