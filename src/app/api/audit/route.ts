import { NextResponse } from "next/server";

const frontendOnlyMessage = {
    ok: false,
    mode: "frontend-only",
    message: "Server-side audit processing is disabled in this frontend-only build.",
};

export async function GET() {
    return NextResponse.json(frontendOnlyMessage, { status: 501 });
}

export async function POST() {
    return NextResponse.json(frontendOnlyMessage, { status: 501 });
}
