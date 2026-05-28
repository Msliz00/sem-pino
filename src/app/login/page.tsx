"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BackgroundLive } from "@/components/BackgroundLive";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao fazer login",
      );
      setLoading(false);
    }
  };

  return (
    <>
      <BackgroundLive />
      <main className="relative z-[1] flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="glass-strong w-full max-w-[400px] space-y-6 rounded-2xl p-8 animate-fade-in-up"
          style={{ boxShadow: "0 0 40px rgba(255, 107, 0, 0.25)" }}
        >
          <div className="space-y-1 text-center">
            <h1 className="text-[34px] font-semibold leading-none tracking-tight">
              Bingo<span className="brand-gradient">Bet</span>
            </h1>
            <p className="font-serif text-base italic text-muted">
              acesso restrito
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
              required
              disabled={loading}
            />
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="senha"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-shine w-full rounded-lg bg-bingo-gradient px-3 py-2.5 text-sm font-medium text-ink transition-all disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {errorMessage && (
            <p
              role="alert"
              className="rounded border-l-2 border-danger bg-danger/[0.08] px-3 py-2 text-sm text-danger"
              style={{ animation: "shake 0.4s ease" }}
            >
              {errorMessage}
            </p>
          )}
        </form>
      </main>
    </>
  );
}
