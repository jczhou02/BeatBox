import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { normalizeString } from "@/app/utils/mashup/utils";
import { toCamelot, formatMusicalKey, noteEnharmonics } from "@/app/utils/music/camelot";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
});
const env = envSchema.parse(process.env);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Track schema coming from client (softTracks -> minimal fields)
const ArtistSchema = z.object({ name: z.string() });
const IncomingTrackSchema = z.object({
  name: z.string().min(1),
  artists: z.array(ArtistSchema).min(1),
  anchor: z.boolean().optional().default(false),
});
const QuerySchema = z.object({
  q: z.string().min(1), // base64url-encoded JSON array of IncomingTrackSchema
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(), // reserved if you paginate later
});

type Row = {
  camelot: string | null;
  musicalKey: string | null;
  bpm: number | null;
  title: string;
  artist: string;
  youtube_id: string | null;
  source_track_id: string | null;
  anchor: boolean;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      q: url.searchParams.get("q"),
      limit: url.searchParams.get("limit") ?? "150",
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
    }

    // Decode base64url -> JSON
    const decoded = JSON.parse(Buffer.from(parsed.data.q, "base64url").toString("utf8")) as unknown;
    const tracksParse = z.array(IncomingTrackSchema).safeParse(decoded);
    if (!tracksParse.success) {
      return NextResponse.json({ error: "Invalid track payload", details: tracksParse.error.flatten() }, { status: 400 });
    }
    const incoming = tracksParse.data;

    // For each incoming track: query Hooktheory by (normalized) title, filter by artists, pick best section
    const rows: Row[] = [];
    for (const t of incoming) {
      const normTitle = normalizeString(t.name);
      const normArtists = t.artists.map(a => a.name.toLowerCase());

      const { data, error } = await supabase
        .from("hooktheory")
        .select("*")
        .ilike("title", `%${normTitle}%`);

      if (error || !data || data.length === 0) {
        rows.push({
          camelot: null,
          musicalKey: null,
          bpm: null,
          title: t.name,
          artist: t.artists.map(a => a.name).join(", "),
          youtube_id: null,
          source_track_id: null,
          anchor: !!t.anchor,
        });
        continue;
      }

      const filtered = data.filter((section: any) =>
        normArtists.some(a => section.artist?.toLowerCase().includes(a))
      );

      const candidates = (filtered.length ? filtered : data) as any[];

      // Heuristic: prefer a section that has youtube_id, then one with (key & bpm), else first
      const scored = candidates
        .map(s => {
          const hasYT = !!s.youtube_id;
          const hasMeta = !!s.key && !!s.bpm;
          const score = (hasYT ? 2 : 0) + (hasMeta ? 1 : 0);
          return { s, score };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0]?.s ?? candidates[0];
      const musicalKey = best?.key && best?.scale ? formatMusicalKey(best.key, best.scale) : null;
      const camelot = musicalKey ? toCamelot(musicalKey) : null;

      rows.push({
        camelot,
        musicalKey,
        bpm: typeof best?.bpm === "number" ? Math.round(best.bpm) : null,
        title: best?.title ?? t.name,
        artist: best?.artist ?? t.artists.map(a => a.name).join(", "),
        youtube_id: best?.youtube_id ?? null,
        source_track_id: best?.source_track_id ?? null,
        anchor: !!t.anchor,
      });
    }

    return NextResponse.json({ rows, nextCursor: null }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
