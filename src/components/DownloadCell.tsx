"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import { parsePaths, extractStorageMeta } from "@/lib/storage-paths";

type Props = {
  uploadId: string;
  arquivoNome: string;
};

type ParsedPath = {
  index: number;
  btag: string | null;
  fileName: string;
};

export function DownloadCell({ uploadId, arquivoNome }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo<ParsedPath[]>(() => {
    const paths = parsePaths(arquivoNome);
    return paths.map((p, idx) => {
      const { btag, fileName } = extractStorageMeta(p);
      return { index: idx, btag, fileName };
    });
  }, [arquivoNome]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (items.length <= 1) {
    return (
      <a
        href={`/api/uploads/${uploadId}/download`}
        target="_blank"
        rel="noreferrer"
        className="rounded p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
        aria-label="Baixar planilha"
      >
        <Download size={16} />
      </a>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-0.5 rounded p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
        aria-label={`Baixar ${items.length} planilhas`}
        aria-expanded={open}
      >
        <Download size={16} />
        <span className="font-mono text-[10px]">{items.length}</span>
        <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className="glass-strong absolute right-0 top-full z-20 mt-1 min-w-[220px] overflow-hidden rounded-lg shadow-2xl"
          role="menu"
        >
          {items.map((item) => (
            <a
              key={item.index}
              href={`/api/uploads/${uploadId}/download?index=${item.index}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 border-b border-white/[0.04] px-3 py-2 text-xs transition-colors last:border-b-0 hover:bg-white/[0.06]"
              role="menuitem"
            >
              <span className="text-bingo font-mono uppercase tracking-wide">
                {item.btag ?? `#${item.index + 1}`}
              </span>
              <span className="truncate text-muted">{item.fileName}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
