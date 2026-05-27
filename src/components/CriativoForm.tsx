"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  STATUSES,
  type CriativoStatus,
  isDriveUrl,
  isValidMetaAdId,
  isValidUrl,
} from "@/lib/criativos-validations";

export type ExpertOption = { id: string; slug: string; nome: string };

function todayYMD(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function CriativoForm({ experts }: { experts: ExpertOption[] }) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState(todayYMD());
  const [expertId, setExpertId] = useState<string>(experts[0]?.id ?? "");
  const [status, setStatus] = useState<CriativoStatus>("PENDENTE");
  const [driveUrl, setDriveUrl] = useState("");
  const [metaAdId, setMetaAdId] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!nome.trim()) return "Nome obrigatório";
    if (!data) return "Data obrigatória";
    if (!expertId) return "Expert obrigatório";
    if (driveUrl && !isDriveUrl(driveUrl)) {
      return "Drive URL inválida (use drive.google.com ou docs.google.com)";
    }
    if (metaAdId && !isValidMetaAdId(metaAdId)) {
      return "Meta Ad ID inválido (só dígitos, 10-20 chars)";
    }
    if (destinationUrl && !isValidUrl(destinationUrl)) {
      return "Destination URL inválida";
    }
    return null;
  };

  const reset = () => {
    setNome("");
    setData(todayYMD());
    setStatus("PENDENTE");
    setDriveUrl("");
    setMetaAdId("");
    setDestinationUrl("");
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      setSuccess(null);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/criativos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          data_criacao: data,
          expert_id: expertId,
          status,
          drive_url: driveUrl.trim() || null,
          meta_ad_id: metaAdId.trim() || null,
          destination_url: destinationUrl.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao cadastrar");
      setSuccess(`Criativo "${nome.trim()}" cadastrado!`);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setSaving(false);
    }
  };

  const inlineError = !error ? validate() : null;

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-snow">
          Nome do criativo
        </label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={saving}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-snow outline-none transition-colors focus:border-bingo"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-snow">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={saving}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-snow outline-none transition-colors focus:border-bingo"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-snow">Expert</label>
          <select
            value={expertId}
            onChange={(e) => setExpertId(e.target.value)}
            disabled={saving}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-snow outline-none transition-colors focus:border-bingo"
          >
            <option value="" disabled className="bg-surface">
              Selecione
            </option>
            {experts.map((e) => (
              <option key={e.id} value={e.id} className="bg-surface">
                {e.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-snow">Status</label>
        <div className="flex gap-2">
          {STATUSES.map((s) => {
            const active = status === s;
            const color =
              s === "ATIVO"
                ? active
                  ? "border-success bg-success/[0.15] text-snow"
                  : ""
                : s === "DESCARTE"
                  ? active
                    ? "border-danger bg-danger/[0.15] text-snow"
                    : ""
                  : active
                    ? "border-warning bg-warning/[0.15] text-snow"
                    : "";
            return (
              <label
                key={s}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  active
                    ? color
                    : "border-white/[0.08] bg-white/[0.03] text-muted hover:text-snow"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={active}
                  onChange={() => setStatus(s)}
                  disabled={saving}
                  className="sr-only"
                />
                {s === "ATIVO" ? "Ativo" : s === "DESCARTE" ? "Descarte" : "Pendente"}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-snow">Drive URL</label>
        <input
          type="text"
          value={driveUrl}
          onChange={(e) => setDriveUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
          disabled={saving}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-snow">Meta Ad ID</label>
        <input
          type="text"
          value={metaAdId}
          onChange={(e) => setMetaAdId(e.target.value)}
          placeholder="120208123456789"
          disabled={saving}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-snow">Destination URL</label>
        <input
          type="text"
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://..."
          disabled={saving}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
        />
      </div>

      {inlineError && (
        <p className="text-xs text-warning">{inlineError}</p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded border-l-2 border-danger bg-danger/[0.08] px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded border-l-2 border-success bg-success/[0.08] px-3 py-2 text-sm text-success"
        >
          {success}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !!validate()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-bingo-gradient px-3 py-3 text-sm font-medium text-ink transition-all hover:shadow-[0_0_24px_-4px_rgba(255,107,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? "Cadastrando..." : "Cadastrar"}
      </button>
    </div>
  );
}
