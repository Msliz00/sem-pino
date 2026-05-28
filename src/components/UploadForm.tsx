"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload as UploadIcon,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  parseRegistrations,
  type ParsedData,
} from "@/lib/parsers/parseRegistrations";
import { ConflictDialog } from "@/components/ConflictDialog";

type Expert = { slug: string; nome: string };

type FeedbackBanner =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

type ConflictState = {
  expertNome: string;
  dataReferencia: string;
} | null;

function formatDateBR(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDistribuicao(
  dist: ParsedData["distribuicao_origens"],
): string {
  return Object.entries(dist)
    .sort((a, b) => b[1].registros - a[1].registros)
    .map(([k, v]) => `${k} ${v.registros}`)
    .join(" · ");
}

export function UploadForm({ experts }: { experts: Expert[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [expertSlug, setExpertSlug] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [investimento, setInvestimento] = useState<string>("0");
  const [cliques, setCliques] = useState<string>("0");
  const [entradas, setEntradas] = useState<string>("0");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackBanner>(null);
  const [conflict, setConflict] = useState<ConflictState>(null);

  const canSubmit = !!expertSlug && !!file && !!parsedData && !parseError;
  const showPreview = !!file && !!parsedData;
  const showDropZone = !showPreview;

  const resetFile = () => {
    setFile(null);
    setParsedData(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelected = async (f: File) => {
    setParsedData(null);
    setParseError(null);
    try {
      const buffer = await f.arrayBuffer();
      const parsed = parseRegistrations(buffer);
      setFile(f);
      setParsedData(parsed);
    } catch (err) {
      setFile(null);
      setParseError(
        err instanceof Error ? err.message : "Erro ao processar planilha.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelected(f);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelected(f);
  };

  const submit = async (overwrite: boolean) => {
    if (!file || !parsedData || !expertSlug) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("expert_slug", expertSlug);
      formData.append("investimento", investimento || "0");
      formData.append("cliques", cliques || "0");
      formData.append("entradas", entradas || "0");
      if (overwrite) formData.append("overwrite", "true");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.status === 409 && data.error === "duplicate") {
        setConflict({
          expertNome: data.expert_nome,
          dataReferencia: data.data_referencia,
        });
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        setFeedback({
          kind: "error",
          message: data.error ?? "Erro ao salvar upload.",
        });
        setSubmitting(false);
        return;
      }

      const s = data.summary;
      setFeedback({
        kind: "success",
        message: `Upload salvo! ${s.total_registros} registros · ${s.total_ftd} FTD · Data ${formatDateBR(s.data_referencia)}`,
      });
      setExpertSlug("");
      setInvestimento("0");
      setCliques("0");
      setEntradas("0");
      resetFile();
      router.refresh();
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Erro de rede.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[600px] space-y-8">
      {/* Expert */}
      <section className="space-y-2">
        <label className="text-sm font-medium text-snow">
          Selecionar Expert
        </label>
        <select
          value={expertSlug}
          onChange={(e) => setExpertSlug(e.target.value)}
          required
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-snow outline-none transition-colors focus:border-bingo"
        >
          <option value="" disabled>
            Selecione um expert
          </option>
          {experts.map((e) => (
            <option key={e.slug} value={e.slug} className="bg-surface">
              {e.nome}
            </option>
          ))}
        </select>
      </section>

      {/* Upload */}
      <section className="space-y-3">
        <label className="text-sm font-medium text-snow">
          Upload da Planilha
        </label>

        {showDropZone && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center transition-colors animate-pulse-border ${
              dragOver
                ? "border-bingo bg-bingo/[0.08]"
                : "border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            <UploadIcon size={28} strokeWidth={1.5} className="text-muted" />
            <p className="text-sm text-snow">
              Arraste o arquivo aqui ou clique pra selecionar
            </p>
            <p className="text-xs text-muted">.xlsx ou .csv</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        )}

        {showPreview && file && parsedData && (
          <div
            className="glass relative rounded-2xl p-4 animate-fade-in-up"
            style={{ borderLeft: "3px solid #ff6b00" }}
          >
            <button
              type="button"
              onClick={resetFile}
              className="absolute right-3 top-3 rounded p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
              aria-label="Remover arquivo"
            >
              <X size={18} />
            </button>

            <div className="space-y-2 pr-8">
              <p className="truncate font-mono text-sm text-muted">
                {file.name} · {formatFileSize(file.size)}
              </p>
              <p className="text-base font-semibold text-snow">
                {parsedData.total_registros} registros ·{" "}
                {parsedData.total_ftd} FTD
              </p>
              <p className="font-mono text-sm text-muted">
                Data: {formatDateBR(parsedData.data_referencia)}
                {parsedData.affiliate_id_detectado && (
                  <>
                    {" · "}AffiliateId detectado:{" "}
                    {parsedData.affiliate_id_detectado}
                  </>
                )}
              </p>
              <p className="text-xs text-muted">
                Distribuição:{" "}
                {formatDistribuicao(parsedData.distribuicao_origens)}
              </p>
            </div>
          </div>
        )}

        {parseError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded bg-danger/[0.08] px-3 py-3 text-sm text-danger"
            style={{ borderLeft: "3px solid #ef4444" }}
          >
            <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </section>

      {/* Manual metrics */}
      {parsedData && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-snow">Métricas Manuais</h3>
            <p className="text-xs text-muted">
              Preencha investimento, cliques e entradas (dados não vêm na
              planilha)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted">Investimento (R$)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={investimento}
                onChange={(e) => setInvestimento(e.target.value)}
                required
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
                required
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
                required
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-snow outline-none transition-colors focus:border-bingo"
              />
            </div>
          </div>
        </section>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={() => submit(false)}
        disabled={!canSubmit || submitting}
        className={`btn-shine flex w-full items-center justify-center gap-2 rounded-lg bg-bingo-gradient px-3 py-3 text-sm font-medium text-ink transition-all hover:shadow-[0_0_24px_-4px_rgba(255,107,0,0.6)] disabled:shadow-none ${
          submitting
            ? "cursor-not-allowed opacity-60"
            : "disabled:cursor-not-allowed disabled:opacity-40"
        }`}
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Salvando..." : "Salvar"}
      </button>

      {feedback && (
        <p
          role="alert"
          className={`rounded border-l-2 px-3 py-2 text-sm ${
            feedback.kind === "success"
              ? "border-success bg-success/[0.08] text-success"
              : "border-danger bg-danger/[0.08] text-danger"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <ConflictDialog
        open={!!conflict}
        expertNome={conflict?.expertNome ?? ""}
        dataReferencia={conflict?.dataReferencia ?? ""}
        onCancel={() => setConflict(null)}
        onConfirm={() => {
          setConflict(null);
          submit(true);
        }}
      />
    </div>
  );
}
