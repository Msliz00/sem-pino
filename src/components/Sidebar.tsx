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
      className="fixed left-0 top-0 flex h-screen flex-col border-r border-white/10 bg-black/40"
      style={{ width: 240 }}
    >
      <div className="px-6 py-5 text-lg font-semibold">Painel Experts</div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleSignOut}
        className="m-3 flex items-center gap-3 rounded px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
      >
        <LogOut size={18} />
        <span>Sair</span>
      </button>
    </aside>
  );
}
