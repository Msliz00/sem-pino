"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/historico": "Histórico",
  "/upload": "Upload",
  "/criativos": "Criativos",
  "/gestao": "Gestão",
};

const EXPERTS = ["Todos", "Professor", "Iris Aviator"] as const;
type Expert = (typeof EXPERTS)[number];

export function Header({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [activeExpert, setActiveExpert] = useState<Expert>("Todos");

  const title = PAGE_TITLES[pathname] ?? "";

  return (
    <header
      className="flex items-center justify-between border-b border-white/10 px-6"
      style={{ height: 60 }}
    >
      <h1 className="text-base font-semibold">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1">
          {EXPERTS.map((expert) => {
            const active = activeExpert === expert;
            return (
              <button
                key={expert}
                type="button"
                onClick={() => setActiveExpert(expert)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {expert}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-white/60">{userEmail}</span>
      </div>
    </header>
  );
}
