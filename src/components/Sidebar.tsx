"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Upload,
  Image as ImageIcon,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/historico", label: "Histórico", icon: Clock },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/criativos", label: "Criativos", icon: ImageIcon },
  { href: "/gestao", label: "Gestão", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignora erro de env ausente — segue pro login
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className="glass-strong fixed left-0 top-0 z-10 flex h-screen flex-col"
      style={{ width: 240, borderRight: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="px-6 py-6">
        <div className="text-[24px] font-semibold leading-none tracking-tight">
          Bingo<span className="brand-gradient">Bet</span>
        </div>
        <div
          className="mt-2 font-mono uppercase text-muted"
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
          }}
        >
          Painel Experts
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-all duration-200 ${
                active
                  ? "bg-white/[0.06] text-snow"
                  : "text-muted hover:translate-x-0.5 hover:bg-white/[0.04] hover:text-snow"
              }`}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r"
                  style={{
                    background:
                      "linear-gradient(180deg, var(--orange-400), var(--orange-500))",
                    boxShadow: "0 0 12px rgba(255,107,0,0.6)",
                  }}
                />
              )}
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-ink"
          style={{
            background:
              "linear-gradient(135deg, var(--orange-400), var(--orange-500))",
            boxShadow: "0 0 16px rgba(255,107,0,0.4)",
          }}
        >
          BB
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex flex-1 items-center justify-end gap-2 text-xs text-muted transition-colors hover:text-snow"
        >
          <LogOut size={14} strokeWidth={1.75} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
