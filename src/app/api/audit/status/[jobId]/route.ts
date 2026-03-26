import { NextRequest, NextResponse } from "next/server";
import { normalizeAuditResult } from "@/lib/ai-analyze";
import { AuditJobStatusResponse } from "@/lib/schemas";

const BACKEND_BASE_URL =
    process.env.AUDIT_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await context.params;
        const upstream = await fetch(`${BACKEND_BASE_URL}/api/audit/status/${jobId}`, {
            cache: "no-store",
        });
        const payload = await upstream.json().catch(() => null);

        if (!upstream.ok || !payload) {
            return NextResponse.json(
                { error: payload?.detail || payload?.error || "Failed to fetch audit status." },
                { status: upstream.status || 502 }
            );
        }

        const status = payload as AuditJobStatusResponse;
        if (status.status === "success" && status.result) {
            return NextResponse.json({
                ...status,
                normalizedResult: normalizeAuditResult(status.result),
            });
        }

        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unexpected audit status failure." },
            { status: 500 }
        );
    }
}
