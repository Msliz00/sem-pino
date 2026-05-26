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
      className="fixed left-0 top-0 z-10 flex h-screen flex-col border-r border-white/[0.08] bg-[#06050a]"
      style={{ width: 240 }}
    >
      <div className="px-6 py-6 text-[22px] leading-none tracking-tight">
        <span className="font-semibold text-snow">Painel </span>
        <span className="font-serif italic text-snow/90">Experts</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors ${
                active
                  ? "bg-bingo/[0.15] text-snow"
                  : "text-muted hover:bg-white/[0.04] hover:text-snow"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r bg-bingo" />
              )}
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-snow"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
