"use client";

import { usePathname } from "next/navigation";
import { useExpertFilter } from "@/contexts/ExpertFilterContext";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/historico": "Histórico",
  "/upload": "Upload",
  "/criativos": "Criativos",
  "/gestao": "Gestão",
};

export function Header({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const { expertSelecionado, setExpertSelecionado, experts, loading } =
    useExpertFilter();

  const title = PAGE_TITLES[pathname] ?? "";

  const renderPill = (slug: string, nome: string) => {
    const active = expertSelecionado === slug;
    return (
      <button
        key={slug}
        type="button"
        onClick={() => setExpertSelecionado(slug)}
        className={`rounded-full px-4 py-1.5 text-sm transition-colors duration-200 ${
          active ? "bg-snow text-ink" : "text-muted hover:text-snow"
        }`}
      >
        {nome}
      </button>
    );
  };

  return (
    <header
      className="glass-strong sticky top-0 z-10 flex items-center justify-between px-8"
      style={{ height: 60, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <h1 className="text-[18px] font-semibold tracking-tight text-snow">
        {title}
      </h1>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
          {renderPill("todos", "Todos")}
          {loading && experts.length === 0 ? (
            <div className="mx-1 h-7 w-20 animate-pulse rounded-full bg-white/[0.05]" />
          ) : (
            experts.map((e) => renderPill(e.slug, e.nome))
          )}
        </div>

        <span className="text-sm text-muted">{userEmail}</span>
      </div>
    </header>
  );
}
