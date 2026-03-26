import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.AUDIT_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_BASE_URL}/health`, {
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload) {
      return NextResponse.json(
        {
          status: "degraded",
          frontend: "ok",
          backend: "unavailable",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      frontend: "ok",
      backend: payload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        frontend: "ok",
        backend: "unreachable",
        error: error instanceof Error ? error.message : "Unknown health check failure.",
      },
      { status: 503 },
    );
  }
}
