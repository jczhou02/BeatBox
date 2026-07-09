"use client";
import * as React from "react";
import { useMemo, useState, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input"; // not used; remove or use
import { toast } from "react-hot-toast";

export type PlaylistRow = {
  camelot: string | null;
  musicalKey: string | null;
  bpm: number | null;
  title: string;
  artist: string;
  youtube_id: string | null;
  source_track_id: string | null;
  anchor: boolean;
};

type IncomingTrack = {
  name: string;
  artists: { name: string }[];
  anchor?: boolean;
};

// ---- base64url helper that works in the browser ----
function b64url(obj: unknown) {
  const json = JSON.stringify(obj);
  // Encode to UTF-8 first to support any characters
  const utf8 = new TextEncoder().encode(json);
  // Convert to binary string for btoa
  let bin = "";
  utf8.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  // URL-safe
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export default function MashupTable({
  softTracks,
  onRemove,
}: {
  softTracks: IncomingTrack[];
  onRemove?: (title: string, artist: string) => void;
}) {
  const [rows, setRows] = useState<PlaylistRow[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "camelot", desc: false },
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setBusy(true);
      try {
        const q = b64url(
          softTracks.map((t) => ({
            name: t.name,
            artists: t.artists,
            anchor: !!t.anchor,
          }))
        );
        const res = await fetch(`/api/playlist/analyze?q=${q}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!ignore) setRows((data.rows ?? []) as PlaylistRow[]);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to analyze playlist");
      } finally {
        setBusy(false);
      }
    };
    if (softTracks?.length) load();
    else setRows([]);
    return () => {
      ignore = true;
    };
  }, [softTracks]);

  const columns = useMemo<ColumnDef<PlaylistRow>[]>(() => {
    return [
      {
        id: "play",
        header: "",
        cell: ({ row }) => {
          const yt = row.original.youtube_id;
          return (
            <Button
              variant="ghost"
              size="icon"
              disabled={!yt}
              onClick={() => {
                if (yt) window.open(`https://www.youtube.com/watch?v=${yt}`, "_blank", "noopener,noreferrer");
              }}
              aria-label="Play on YouTube"
              title="Play on YouTube"
            >
              <Play className="h-4 w-4" />
            </Button>
          );
        },
        enableSorting: false,
      },
      { accessorKey: "camelot", header: "Camelot Key" },
      { accessorKey: "musicalKey", header: "Musical Key" },
      {
        accessorKey: "bpm",
        header: "BPM",
        sortUndefined: 1,
        cell: ({ getValue }) => getValue() ?? "—",
      },
      { accessorKey: "title", header: "Title" },
      { accessorKey: "artist", header: "Artist" },
      {
        accessorKey: "youtube_id",
        header: "YouTube_ID",
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? (
            <a
              className="underline text-blue-300"
              href={`https://www.youtube.com/watch?v=${v}`}
              target="_blank"
              rel="noreferrer"
            >
              {v}
            </a>
          ) : (
            "—"
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row, table }) => {
          const r = row.original;
          const allRows = table.getCoreRowModel().rows.map((rr) => rr.original);
          const poolB64 = b64url(allRows);
          const targetB64 = b64url(r);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-gray-800 text-white border border-white/10"
              >
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/playlist/suggest?pool=${poolB64}&target=${targetB64}&n=5`
                      );
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error ?? "Suggest failed");
                      const names = (data.suggestions as PlaylistRow[])
                        .map((s) => `${s.title} — ${s.artist}`)
                        .join("\n");
                      toast.success(`Best next:\n${names}`);
                    } catch (e: any) {
                      toast.error(e?.message ?? "Suggest failed");
                    }
                  }}
                >
                  Suggest next best mix
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRemove?.(r.title, r.artist)}
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [onRemove]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const downloadZip = async (format: "mp3" | "wav") => {
    const ids = rows
      .map((r) => r.youtube_id)
      .filter(Boolean)
      .join(",");
    if (!ids) return toast.error("No YouTube IDs available.");
    const url = `/api/playlist/export?format=${format}&ids=${encodeURIComponent(
      ids
    )}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `playlist_${format}.zip`;
    a.click();
  };

  const curateSet = async () => {
    try {
      const res = await fetch(`/api/playlist/curate?q=${b64url(rows)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Curate failed");
      const newOrder = (data.order as number[]).map((i) => rows[i]);
      setRows(newOrder);
      toast.success("Curated personal DJ set (harmonic + BPM).");
    } catch (e: any) {
      toast.error(e?.message ?? "Curate failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Button disabled={busy || !rows.length} onClick={curateSet}>
          Curate DJ Set
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !rows.length}
          onClick={() => downloadZip("mp3")}
        >
          Export .mp3 (ZIP)
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !rows.length}
          onClick={() => downloadZip("wav")}
        >
          Export .wav (ZIP)
        </Button>
        <span className="text-sm text-gray-400">
          {busy ? "Analyzing playlist…" : rows.length ? `${rows.length} tracks` : "No tracks yet"}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-white">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-2 cursor-pointer select-none"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: " ▲", desc: " ▼" }[
                      h.column.getIsSorted() as string
                    ] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="text-gray-200">
            {table.getRowModel().rows.map((r) => (
              <tr
                key={r.id}
                className={`hover:bg-white/5 ${
                  r.original.anchor ? "bg-green-900/20" : ""
                }`}
              >
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-2 border-t border-white/5">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
