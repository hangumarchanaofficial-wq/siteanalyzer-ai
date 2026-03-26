import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
    process.env.AUDIT_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
const DEFAULT_AI_BACKEND =
    process.env.DEFAULT_AI_BACKEND === "ollama" ? "ollama" : "openrouter";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const url = typeof body?.url === "string" ? body.url.trim() : "";
        const backend =
            body?.backend === "openrouter" || body?.backend === "ollama"
                ? body.backend
                : DEFAULT_AI_BACKEND;

        if (!url) {
            return NextResponse.json({ error: "URL is required." }, { status: 400 });
        }

        const upstream = await fetch(`${BACKEND_BASE_URL}/api/audit/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url, backend }),
            cache: "no-store",
        });

        const payload = await upstream.json().catch(() => null);
        if (!upstream.ok || !payload) {
            return NextResponse.json(
                { error: payload?.detail || payload?.error || "Failed to start audit." },
                { status: upstream.status || 502 }
            );
        }

        return NextResponse.json(payload);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unexpected audit start failure." },
            { status: 500 }
        );
    }
}
