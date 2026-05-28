"use client";

export function Header({ userEmail }: { userEmail: string }) {
  return (
    <header
      className="glass-strong sticky top-0 z-10 flex items-center justify-end px-8"
      style={{ height: 60, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
        {userEmail}
      </span>
    </header>
  );
}
