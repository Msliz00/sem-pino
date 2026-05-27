"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  STATUSES,
  type CriativoStatus,
  isDriveUrl,
  isValidMetaAdId,
  isValidUrl,
} from "@/lib/criativos-validations";

type ExpertOption = { id: string; nome: string };

export type CriativoEditDraft = {
  id: string;
  nome: string;
  data_criacao: string;
  expert_id: string;
  status: CriativoStatus;
  drive_url: string;
  meta_ad_id: string;
  destination_url: string;
};

type Props = {
  open: boolean;
  initial: CriativoEditDraft | null;
  experts: ExpertOption[];
  onClose: () => void;
  onSaved: () => void;
};

export function CriativoEditModal({
  open,
  initial,
  experts,
  onClose,
  onSaved,
}: Props) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [expertId, setExpertId] = useState("");
  const [status, setStatus] = useState<CriativoStatus>("PENDENTE");
  const [driveUrl, setDriveUrl] = useState("");
  const [metaAdId, setMetaAdId] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initial) {
      setNome(initial.nome);
      setData(initial.data_criacao);
      setExpertId(initial.expert_id);
      setStatus(initial.status);
      setDriveUrl(initial.drive_url);
      setMetaAdId(initial.meta_ad_id);
      setDestinationUrl(initial.destination_url);
      setError(null);
    }
  }, [open, initial]);

  if (!open || !initial) return null;

  const validate = (): string | null => {
    if (!nome.trim()) return "Nome obrigatório";
    if (!data) return "Data obrigatória";
    if (!expertId) return "Expert obrigatório";
    if (driveUrl && !isDriveUrl(driveUrl)) {
      return "Drive URL inválida";
    }
    if (metaAdId && !isValidMetaAdId(metaAdId)) {
      return "Meta Ad ID inválido";
    }
    if (destinationUrl && !isValidUrl(destinationUrl)) {
      return "Destination URL inválida";
    }
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
    try {
      const res = await fetch(`/api/criativos/${initial.id}`, {
        method: "PATCH",
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
      if (!res.ok) throw new Error(d.error ?? "Erro");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-6 py-10 backdrop-blur-sm">
      <div className="w-full max-w-[480px] space-y-5 rounded-2xl border border-white/[0.08] bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-snow">Editar criativo</h2>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted">
                Data
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
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
            <label className="text-xs uppercase tracking-wide text-muted">
              Status
            </label>
            <div className="flex gap-2">
              {STATUSES.map((s) => {
                const active = status === s;
                const cls =
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
                    className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-xs transition-colors ${
                      active
                        ? cls
                        : "border-white/[0.08] bg-white/[0.03] text-muted hover:text-snow"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status-edit"
                      value={s}
                      checked={active}
                      onChange={() => setStatus(s)}
                      disabled={saving}
                      className="sr-only"
                    />
                    {s}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Drive URL
            </label>
            <input
              type="text"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              disabled={saving}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Meta Ad ID
            </label>
            <input
              type="text"
              value={metaAdId}
              onChange={(e) => setMetaAdId(e.target.value)}
              disabled={saving}
              placeholder="120208123456789"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Destination URL
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              disabled={saving}
              placeholder="https://..."
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
            />
          </div>
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
