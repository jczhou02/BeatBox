import { NextResponse } from "next/server";
import { z } from "zod";

// Expect the *already analyzed* rows (from /analyze) so we can sort without more DB hits
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
  q: z.string().min(1), // base64url(JSON Row[])
  startIndex: z.coerce.number().int().min(0).optional(), // where to start
});

function camelotNeighbors(tag: string) {
  // tag like "8A" or "9B"
  const m = tag.match(/^(\d{1,2})([AB])$/i);
  if (!m) return [];
  let n = parseInt(m[1], 10);
  const side = m[2].toUpperCase();
  const wrap = (x: number) => (x < 1 ? 12 : x > 12 ? 1 : x);
  const other = side === "A" ? "B" : "A";
  return [
    `${wrap(n - 1)}${side}`,
    `${wrap(n + 1)}${side}`,
    `${n}${other}`, // relative major/minor
  ];
}

function mixScore(a: any, b: any) {
  // Higher is better
  let score = 0;

  if (a.camelot && b.camelot) {
    if (a.camelot === b.camelot) score += 3;
    if (camelotNeighbors(a.camelot).includes(b.camelot)) score += 2;
  }

  if (typeof a.bpm === "number" && typeof b.bpm === "number") {
    const diff = Math.abs(a.bpm - b.bpm);
    if (diff <= 2) score += 3;
    else if (diff <= 4) score += 2;
    else if (diff <= 6) score += 1;
  }
  return score;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const startIndex = Number(url.searchParams.get("startIndex") ?? 0);
    if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

    const decoded = JSON.parse(Buffer.from(q, "base64url").toString("utf8"));
    const parsed = z.array(RowSchema).safeParse(decoded);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid rows", details: parsed.error.flatten() }, { status: 400 });
    }
    const rows = parsed.data;
    if (!rows.length) return NextResponse.json({ order: [] });

    // Choose a start: anchor if present, else startIndex, else 0
    const start =
      rows.findIndex(r => r.anchor) >= 0 ? rows.findIndex(r => r.anchor) :
      (startIndex < rows.length ? startIndex : 0);

    const remaining = rows.map((r, i) => ({ i, r })).filter(x => x.i !== start);
    const order: number[] = [start];

    // Greedy next-best by mixScore
    let last = rows[start];
    while (remaining.length) {
      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const s = mixScore(last, remaining[i].r);
        if (s > bestScore) { bestScore = s; bestIdx = i; }
      }
      const chosen = remaining.splice(bestIdx, 1)[0];
      order.push(chosen.i);
      last = rows[chosen.i];
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
