import { NextResponse } from "next/server";
import { z } from "zod";

const RowSchema = z.object({
  camelot: z.string().nullable(),
  musicalKey: z.string().nullable(),
  bpm: z.number().nullable(),
  title: z.string(),
  artist: z.string(),
  youtube_id: z.string().nullable(),
  source_track_id: z.string().nullable(),
  anchor: z.boolean(),
});

const QuerySchema = z.object({
  pool: z.string().min(1),  // base64url(JSON Row[])
  target: z.string().min(1), // base64url(JSON Row)
  n: z.coerce.number().int().min(1).max(10).optional(),
});

function camelotNeighbors(tag?: string | null) {
  if (!tag) return [];
  const m = tag.match(/^(\d{1,2})([AB])$/i);
  if (!m) return [];
  let n = parseInt(m[1], 10);
  const side = m[2].toUpperCase();
  const wrap = (x: number) => (x < 1 ? 12 : x > 12 ? 1 : x);
  const other = side === "A" ? "B" : "A";
  return new Set([`${wrap(n - 1)}${side}`, `${wrap(n + 1)}${side}`, `${n}${other}`]);
}

function score(target: any, cand: any) {
  let s = 0;
  if (target.camelot && cand.camelot) {
    if (target.camelot === cand.camelot) s += 3;
    const neigh = camelotNeighbors(target.camelot);
    if (neigh.has(cand.camelot)) s += 2;
  }
  if (typeof target.bpm === "number" && typeof cand.bpm === "number") {
    const diff = Math.abs(target.bpm - cand.bpm);
    if (diff <= 2) s += 3;
    else if (diff <= 4) s += 2;
    else if (diff <= 6) s += 1;
  }
  return s;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const poolStr = url.searchParams.get("pool");
    const targetStr = url.searchParams.get("target");
    const n = Number(url.searchParams.get("n") ?? 5);
    if (!poolStr || !targetStr) return NextResponse.json({ error: "Missing pool/target" }, { status: 400 });

    const pool = z.array(RowSchema).parse(JSON.parse(Buffer.from(poolStr, "base64url").toString("utf8")));
    const target = RowSchema.parse(JSON.parse(Buffer.from(targetStr, "base64url").toString("utf8")));

    const ranked = pool
      .filter(p => p.title !== target.title || p.artist !== target.artist)
      .map(p => ({ p, s: score(target, p) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, n)
      .map(x => x.p);

    return NextResponse.json({ suggestions: ranked }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
