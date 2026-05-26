"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-white/5 p-6"
      >
        <h1 className="text-xl font-semibold">Painel Experts - Login</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="senha"
          className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          className="w-full rounded bg-white px-3 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
