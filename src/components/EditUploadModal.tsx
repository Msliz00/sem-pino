"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload as UploadIcon,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  parseRegistrations,
  type ParsedData,
} from "@/lib/parsers/parseRegistrations";
import type { HistoricoUpload } from "@/components/HistoricoView";

type Props = {
  upload: HistoricoUpload | null;
  onClose: () => void;
  onSaved: () => void;
};

function formatDateBR(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatMoney(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function EditUploadModal({ upload, onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [investimento, setInvestimento] = useState("0");
  const [cliques, setCliques] = useState("0");
  const [entradas, setEntradas] = useState("0");

  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceParsed, setReplaceParsed] = useState<ParsedData | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (upload) {
      setInvestimento(String(upload.investimento));
      setCliques(String(upload.cliques));
      setEntradas(String(upload.entradas_grupo));
      setReplaceFile(null);
      setReplaceParsed(null);
      setReplaceError(null);
      setSubmitError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [upload]);

  if (!upload) return null;

  const handleFileSelected = async (f: File) => {
    setReplaceParsed(null);
    setReplaceError(null);
    try {
      const buf = await f.arrayBuffer();
      const parsed = parseRegistrations(buf, { strict: true });
      setReplaceFile(f);
      setReplaceParsed(parsed);
    } catch (e) {
      setReplaceFile(null);
      setReplaceError(
        e instanceof Error ? e.message : "Erro ao processar planilha",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resetReplace = () => {
    setReplaceFile(null);
    setReplaceParsed(null);
    setReplaceError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const inv = Number(investimento);
    const cli = Number(cliques);
    const ent = Number(entradas);
    if ([inv, cli, ent].some((v) => Number.isNaN(v) || v < 0)) {
      setSubmitError("Valores não podem ser negativos.");
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const patchRes = await fetch(`/api/uploads/${upload.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          investimento: inv,
          cliques: cli,
          entradas_grupo: ent,
        }),
      });
      if (!patchRes.ok) {
        const d = await patchRes.json().catch(() => ({}));
        throw new Error(d.error ?? "Erro ao salvar inputs");
      }

      if (replaceFile && replaceParsed) {
        const fd = new FormData();
        fd.append("file", replaceFile);
        const repRes = await fetch(`/api/uploads/${upload.id}/replace`, {
          method: "POST",
          body: fd,
        });
        if (!repRes.ok) {
          const d = await repRes.json().catch(() => ({}));
          throw new Error(d.error ?? "Erro ao substituir planilha");
        }
      }

      onSaved();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setSaving(false);
    }
  };

  const expertNome = upload.expert?.nome ?? "—";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-6 py-10 backdrop-blur-sm">
      <div className="w-full max-w-[600px] space-y-6 rounded-2xl border border-white/[0.08] bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-snow">
            Editar upload — {expertNome} —{" "}
            {formatDateBR(upload.data_referencia)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Inputs manuais */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-snow">Inputs Manuais</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted">Investimento (R$)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={investimento}
                onChange={(e) => setInvestimento(e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow outline-none transition-colors focus:border-bingo"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted">Cliques</span>
              <input
                type="number"
                step="1"
                min="0"
                value={cliques}
                onChange={(e) => setCliques(e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow outline-none transition-colors focus:border-bingo"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted">Entradas no Grupo</span>
              <input
                type="number"
                step="1"
                min="0"
                value={entradas}
                onChange={(e) => setEntradas(e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow outline-none transition-colors focus:border-bingo"
              />
            </div>
          </div>
        </section>

        {/* Dados da planilha */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-snow">Dados da Planilha</h3>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Total Registros
              </p>
              <p className="mt-1 font-mono text-base text-snow">
                {formatNumber(upload.total_registros)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Total FTD
              </p>
              <p className="mt-1 font-mono text-base text-snow">
                {formatNumber(upload.total_ftd)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Total Depósitos
              </p>
              <p className="mt-1 font-mono text-base text-snow">
                {formatMoney(upload.total_deposits)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Total NGR
              </p>
              <p className="mt-1 font-mono text-base text-snow">
                {formatMoney(upload.total_net_deposits)}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted">
              Distribuição de origens
            </p>
            <ul className="grid grid-cols-2 gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 font-mono text-xs text-muted">
              {Object.entries(upload.distribuicao_origens)
                .sort((a, b) => b[1].registros - a[1].registros)
                .map(([k, v]) => (
                  <li key={k}>
                    <span className="text-snow/80">{k}</span>: {v.registros}{" "}
                    reg · {v.ftd} FTD
                  </li>
                ))}
              {Object.keys(upload.distribuicao_origens).length === 0 && (
                <li className="col-span-2 text-muted">Sem dados</li>
              )}
            </ul>
          </div>
        </section>

        {/* Re-upload */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-snow">
            Re-upload da Planilha
          </h3>
          <p
            className="rounded bg-bingo/[0.08] px-3 py-2 text-xs text-bingo"
            style={{ borderLeft: "3px solid #ff6b00" }}
          >
            Re-upload vai sobrescrever os totais extraídos da planilha. Inputs
            manuais permanecem.
          </p>

          {!replaceFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileSelected(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
                dragOver
                  ? "border-bingo bg-bingo/[0.08]"
                  : "border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <UploadIcon size={22} strokeWidth={1.5} className="text-muted" />
              <p className="text-sm text-snow">
                Arraste ou clique pra selecionar
              </p>
              <p className="text-xs text-muted">.xlsx ou .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div
              className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
              style={{ borderLeft: "3px solid #ff6b00" }}
            >
              <button
                type="button"
                onClick={resetReplace}
                className="absolute right-2 top-2 rounded p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
                aria-label="Remover arquivo"
              >
                <X size={16} />
              </button>
              <p className="font-mono text-xs text-muted">
                {replaceFile.name} · {formatFileSize(replaceFile.size)}
              </p>
              {replaceParsed && (
                <p className="mt-1 text-sm text-snow">
                  {replaceParsed.total_registros} registros ·{" "}
                  {replaceParsed.total_ftd} FTD · Data{" "}
                  {formatDateBR(replaceParsed.data_referencia)}
                </p>
              )}
            </div>
          )}

          {replaceError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded bg-danger/[0.08] px-3 py-3 text-sm text-danger"
              style={{ borderLeft: "3px solid #ef4444" }}
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{replaceError}</span>
            </div>
          )}
        </section>

        {/* Download */}
        {upload.arquivo_nome && (
          <a
            href={`/api/uploads/${upload.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-snow"
          >
            <Download size={16} />
            Baixar planilha original
          </a>
        )}

        {/* Footer */}
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
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-bingo-gradient px-4 py-2 text-sm font-medium text-ink transition-all hover:shadow-[0_0_24px_-4px_rgba(255,107,0,0.6)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {submitError && (
          <p
            role="alert"
            className="rounded border-l-2 border-danger bg-danger/[0.08] px-3 py-2 text-sm text-danger"
          >
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
