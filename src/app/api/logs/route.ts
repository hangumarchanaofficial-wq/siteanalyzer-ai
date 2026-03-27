import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const LOG_DIR = path.join(process.cwd(), "logs");

async function readLogFile(filename: string) {
  try {
    return await fs.readFile(path.join(LOG_DIR, filename), "utf-8");
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    const [summary, sampleInput, samplePrompt, sampleRawOutput] = await Promise.all([
      readLogFile("prompt-log.md"),
      readLogFile("sample-input.json"),
      readLogFile("sample-prompt.txt"),
      readLogFile("sample-raw-output.json"),
    ]);

    let updatedAt: string | null = null;
    try {
      const stat = await fs.stat(path.join(LOG_DIR, "sample-raw-output.json"));
      updatedAt = stat.mtime.toISOString();
    } catch {
      updatedAt = null;
    }

    return NextResponse.json({
      summary,
      sampleInput,
      samplePrompt,
      sampleRawOutput,
      updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to read prompt logs.",
      },
      { status: 500 },
    );
  }
}
