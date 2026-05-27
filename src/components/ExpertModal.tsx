"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

export type ExpertDraft = {
  id: string | null;
  nome: string;
  slug: string;
};

type Props = {
  open: boolean;
  initial: ExpertDraft | null;
  onClose: () => void;
  onSaved: () => void;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_RE = /^[a-z0-9-]+$/;

export function ExpertModal({ open, initial, onClose, onSaved }: Props) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNome(initial?.nome ?? "");
      setSlug(initial?.slug ?? "");
      setSlugTouched(!!initial?.id);
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  const handleNomeChange = (v: string) => {
    setNome(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const validate = (): string | null => {
    if (!nome.trim()) return "Nome obrigatório";
    if (!slug.trim()) return "Slug obrigatório";
    if (!SLUG_RE.test(slug)) {
      return "Slug inválido (use só letras minúsculas, números e hífens)";
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

    const url = initial?.id ? `/api/experts/${initial.id}` : "/api/experts";
    const method = initial?.id ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), slug: slug.trim() }),
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
            {initial?.id ? "Editar Expert" : "Novo Expert"}
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
              onChange={(e) => handleNomeChange(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-bingo"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              disabled={saving}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow outline-none transition-colors focus:border-bingo"
            />
            <p className="text-xs text-muted">
              Use apenas letras minúsculas, números e hífens
            </p>
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
