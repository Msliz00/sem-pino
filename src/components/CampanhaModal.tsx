"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

export type CampanhaDraft = {
  id: string | null;
  nome: string;
  marca: "BINGO" | "REALS";
  expert_id: string;
  codigo_ux: string;
  affiliate_id: string;
};

type ExpertOption = { id: string; nome: string };

type Props = {
  open: boolean;
  initial: CampanhaDraft | null;
  experts: ExpertOption[];
  onClose: () => void;
  onSaved: () => void;
};

export function CampanhaModal({
  open,
  initial,
  experts,
  onClose,
  onSaved,
}: Props) {
  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState<"BINGO" | "REALS">("BINGO");
  const [expertId, setExpertId] = useState("");
  const [codigoUx, setCodigoUx] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNome(initial?.nome ?? "");
      setMarca(initial?.marca ?? "BINGO");
      setExpertId(initial?.expert_id ?? experts[0]?.id ?? "");
      setCodigoUx(initial?.codigo_ux ?? "");
      setAffiliateId(initial?.affiliate_id ?? "");
      setError(null);
    }
  }, [open, initial, experts]);

  if (!open) return null;

  const validate = (): string | null => {
    if (!nome.trim()) return "Nome obrigatório";
    if (!expertId) return "Expert obrigatório";
    if (marca !== "BINGO" && marca !== "REALS") return "Marca inválida";
    return null;
  };

  const handleSave = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    setError(null);

    const url = initial?.id
      ? `/api/campanhas/${initial.id}`
      : "/api/campanhas";
    const method = initial?.id ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          marca,
          expert_id: expertId,
          codigo_ux: codigoUx.trim() || null,
          affiliate_id: affiliateId.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erro ao salvar");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setSaving(false);
    }
  };

  const inlineError = !error ? validate() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-6 py-10 backdrop-blur-sm">
      <div className="w-full max-w-[480px] space-y-5 rounded-2xl border border-white/[0.08] bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-snow">
            {initial?.id ? "Editar Campanha" : "Nova Campanha"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-bingo"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Expert
            </label>
            <select
              value={expertId}
              onChange={(e) => setExpertId(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-bingo"
            >
              <option value="" className="bg-surface" disabled>
                Selecione um expert
              </option>
              {experts.map((e) => (
                <option key={e.id} value={e.id} className="bg-surface">
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted">
              Marca
            </label>
            <div className="flex gap-3">
              {(["BINGO", "REALS"] as const).map((m) => (
                <label
                  key={m}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    marca === m
                      ? m === "BINGO"
                        ? "border-bingo bg-bingo/[0.15] text-snow"
                        : "border-reals bg-reals/[0.15] text-snow"
                      : "border-white/[0.08] bg-white/[0.03] text-muted hover:text-snow"
                  }`}
                >
                  <input
                    type="radio"
                    name="marca"
                    value={m}
                    checked={marca === m}
                    onChange={() => setMarca(m)}
                    disabled={saving}
                    className="sr-only"
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted">
                Código UX
              </label>
              <input
                type="text"
                value={codigoUx}
                onChange={(e) => setCodigoUx(e.target.value)}
                placeholder="opcional"
                disabled={saving}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow outline-none transition-colors focus:border-bingo"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted">
                Affiliate ID
              </label>
              <input
                type="text"
                value={affiliateId}
                onChange={(e) => setAffiliateId(e.target.value)}
                placeholder="opcional"
                disabled={saving}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow outline-none transition-colors focus:border-bingo"
              />
            </div>
          </div>

          {inlineError && (
            <p className="text-xs text-warning">{inlineError}</p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded border-l-2 border-danger bg-danger/[0.08] px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !!validate()}
            className="flex items-center gap-2 rounded-lg bg-bingo-gradient px-4 py-2 text-sm font-medium text-ink transition-all hover:shadow-[0_0_24px_-4px_rgba(255,107,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
