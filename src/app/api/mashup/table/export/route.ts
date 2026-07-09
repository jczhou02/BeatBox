import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  ids: z.string().min(1), // comma-separated YouTube IDs
  format: z.enum(["mp3","wav"]).default("mp3"),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      ids: url.searchParams.get("ids"),
      format: (url.searchParams.get("format") ?? "mp3") as "mp3" | "wav",
    });
    if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

    // Hand off to your Python backend that uses yt-dlp/ffmpeg to build a ZIP.
    // It should stream a .zip back (Content-Type: application/zip).
    const PY_URL = process.env.PYTHON_BACKEND_URL!;
    const resp = await fetch(`${PY_URL}/api/export-zip?format=${parsed.data.format}&ids=${encodeURIComponent(parsed.data.ids)}`);

    if (!resp.ok || !resp.body) {
      return NextResponse.json({ error: `Backend failed: ${resp.status}` }, { status: 502 });
    }

    const headers = new Headers(resp.headers);
    headers.set("Content-Disposition", `attachment; filename="playlist_${parsed.data.format}.zip"`);
    headers.set("Content-Type", "application/zip");

    return new NextResponse(resp.body, { status: 200, headers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
