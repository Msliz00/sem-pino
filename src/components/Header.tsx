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
      className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[rgba(8,7,10,0.6)] px-8 backdrop-blur-xl"
      style={{ height: 60 }}
    >
      <h1 className="text-[18px] font-semibold tracking-tight text-snow">
        {title}
      </h1>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
          {EXPERTS.map((expert) => {
            const active = activeExpert === expert;
            return (
              <button
                key={expert}
                type="button"
                onClick={() => setActiveExpert(expert)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors duration-200 ${
                  active
                    ? "bg-snow text-ink"
                    : "text-muted hover:text-snow"
                }`}
              >
                {expert}
              </button>
            );
          })}
        </div>

        <span className="text-sm text-muted">{userEmail}</span>
      </div>
    </header>
  );
}
