import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.INTERNAL_API_URL ?? "http://localhost:8000";

async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;

  // Preserve trailing slash — Next.js drops it from catch-all params but FastAPI
  // requires it for routes defined as @router.post("/").  Without it, FastAPI
  // 307-redirects /accounts → /accounts/ and we can't follow with a streaming body.
  const hasTrailingSlash = request.nextUrl.pathname.endsWith("/");
  const pathname = "/" + path.join("/") + (hasTrailingSlash ? "/" : "");

  // Forward query string
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}${pathname}${search}`;

  const headers = new Headers();
  // Forward content-type for uploads
  const ct = request.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const isBodyMethod = !["GET", "HEAD"].includes(request.method);

  // Stream request.body directly as a ReadableStream — avoids the ArrayBuffer
  // detachment issue where Undici transfers (detaches) the buffer when sending,
  // making any subsequent .slice() throw on the detached ArrayBuffer.
  // redirect: "manual" ensures Undici never needs to re-consume the body.
  const fetchOptions: RequestInit & { duplex?: string } = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (isBodyMethod && request.body) {
    fetchOptions.body = request.body;
    fetchOptions.duplex = "half"; // required by Node.js/Undici for streaming bodies
  }

  const response = await fetch(targetUrl, fetchOptions);

  const resHeaders = new Headers(response.headers);
  // Remove encoding headers that Next.js handles itself
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("connection");

  // Rewrite redirect Location headers so internal backend URLs stay within the proxy
  if (response.status >= 300 && response.status < 400) {
    const loc = response.headers.get("location") ?? "";
    if (loc.startsWith(BACKEND_URL)) {
      resHeaders.set("location", "/backend" + loc.slice(BACKEND_URL.length));
    }
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: resHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
