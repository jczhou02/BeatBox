"use client";
import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-black/20">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-white hover:bg-white/10 rounded-t-xl"
      >
        <span className="text-xl font-semibold">{title}</span>
        <ChevronsUpDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
