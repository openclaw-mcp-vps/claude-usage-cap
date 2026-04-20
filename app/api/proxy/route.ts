import { proxyAnthropicRequest } from "@/lib/anthropic-proxy";

export const runtime = "nodejs";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-proxy-key, anthropic-version, anthropic-beta"
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function POST(request: Request) {
  const proxyKeyHeader = request.headers.get("x-proxy-key");
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const proxyKey = proxyKeyHeader || bearerToken;

  if (!proxyKey) {
    return Response.json(
      { error: "Missing proxy key. Provide x-proxy-key header or Bearer token." },
      {
        status: 401,
        headers: corsHeaders()
      }
    );
  }

  return proxyAnthropicRequest({
    request,
    proxyKey
  });
}
