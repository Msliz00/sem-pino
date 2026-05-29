"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload as UploadIcon,
  X,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import {
  parseRegistrations,
  type ParsedData,
} from "@/lib/parsers/parseRegistrations";
import { ConflictDialog } from "@/components/ConflictDialog";

type Expert = { id: string; slug: string; nome: string };

type FileEntry = {
  id: string;
  file: File;
  parsed: ParsedData | null;
  error: string | null;
};

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

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatInt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

type EntryValidation = {
  invalidBtags: string[];
  isMixed: boolean;
};

function validateEntry(
  entry: FileEntry,
  expertBtags: Set<string>,
): EntryValidation {
  if (!entry.parsed) return { invalidBtags: [], isMixed: false };
  const distintos = entry.parsed.btags_distintos;
  if (distintos.length === 0) {
    return { invalidBtags: ["(sem AffiliateId)"], isMixed: false };
  }
  // Se ainda não carregou o set, não acusa inválido (evita flash vermelho)
  if (expertBtags.size === 0) {
    return { invalidBtags: [], isMixed: distintos.length > 1 };
  }
  const invalidBtags = distintos
    .map((b) => b.btag.trim())
    .filter((b) => !expertBtags.has(b));
  return { invalidBtags, isMixed: distintos.length > 1 };
}

export function UploadForm({ experts }: { experts: Expert[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [expertSlug, setExpertSlug] = useState<string>("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [investimento, setInvestimento] = useState<string>("0");
  const [cliques, setCliques] = useState<string>("0");
  const [entradas, setEntradas] = useState<string>("0");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackBanner>(null);
  const [conflict, setConflict] = useState<ConflictState>(null);

  const [expertBtags, setExpertBtags] = useState<Set<string>>(new Set());
  const [btagsLoading, setBtagsLoading] = useState(false);
  const [btagsError, setBtagsError] = useState<string | null>(null);

  const selectedExpert = experts.find((e) => e.slug === expertSlug) ?? null;

  // Fetcha BTAGs do expert sempre que muda a seleção
  useEffect(() => {
    if (!selectedExpert) {
      setExpertBtags(new Set());
      setBtagsError(null);
      return;
    }
    let cancelled = false;
    setBtagsLoading(true);
    setBtagsError(null);
    fetch(`/api/campanhas?expert_id=${selectedExpert.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const set = new Set<string>();
        const rows = (d.data ?? []) as {
          codigo_ux: string | null;
          affiliate_id: string | null;
        }[];
        rows.forEach((c) => {
          if (c.codigo_ux) set.add(String(c.codigo_ux).trim());
          if (c.affiliate_id) set.add(String(c.affiliate_id).trim());
        });
        setExpertBtags(set);
        if (set.size === 0) {
          setBtagsError(
            `Expert "${selectedExpert.nome}" não tem BTAGs cadastrados. Vá em /gestao e cadastre campanhas antes de subir planilhas.`,
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          setBtagsError("Falha ao carregar BTAGs do expert.");
      })
      .finally(() => {
        if (!cancelled) setBtagsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedExpert]);

  const parsedEntries = entries.filter((e) => e.parsed !== null);
  const hasParseErrors = entries.some((e) => e.error !== null);

  // Conflito de datas (client-side)
  const dataSet = new Set(
    parsedEntries.map((e) => e.parsed!.data_referencia),
  );
  const dateConflict = dataSet.size > 1;

  // Validação de BTAG por arquivo (eager — só quando o set já foi carregado)
  const entryValidations = new Map<string, EntryValidation>();
  for (const entry of entries) {
    entryValidations.set(entry.id, validateEntry(entry, expertBtags));
  }
  const anyBtagInvalid =
    expertBtags.size > 0 &&
    entries.some((e) => {
      const v = entryValidations.get(e.id);
      return v ? v.invalidBtags.length > 0 : false;
    });

  // Totais consolidados (preview)
  const totals = parsedEntries.reduce(
    (acc, e) => ({
      registros: acc.registros + e.parsed!.total_registros,
      ftd: acc.ftd + e.parsed!.total_ftd,
      deposits: acc.deposits + e.parsed!.total_deposits,
      ngr: acc.ngr + e.parsed!.total_net_deposits,
    }),
    { registros: 0, ftd: 0, deposits: 0, ngr: 0 },
  );

  const canSubmit =
    !!expertSlug &&
    entries.length > 0 &&
    parsedEntries.length === entries.length &&
    !dateConflict &&
    !anyBtagInvalid &&
    !hasParseErrors;

  const dataReferencia =
    !dateConflict && parsedEntries.length > 0
      ? parsedEntries[0].parsed!.data_referencia
      : null;

  const handleFilesSelected = async (files: File[]) => {
    const newEntries: FileEntry[] = files.map((f) => ({
      id: uid(),
      file: f,
      parsed: null,
      error: null,
    }));
    setEntries((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      try {
        const buffer = await entry.file.arrayBuffer();
        const parsed = parseRegistrations(buffer);
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, parsed } : e)),
        );
      } catch (err) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? {
                  ...e,
                  error:
                    err instanceof Error
                      ? err.message
                      : "Erro ao processar planilha.",
                }
              : e,
          ),
        );
      }
    }
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const resetAll = () => {
    setEntries([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) handleFilesSelected(files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleFilesSelected(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (overwrite: boolean) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      for (const entry of entries) {
        formData.append("file", entry.file);
      }
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
        message: `Upload salvo! ${s.arquivos} arquivo(s) · ${s.total_registros} registros · ${s.total_ftd} FTD · Data ${formatDateBR(s.data_referencia)}`,
      });
      setExpertSlug("");
      setInvestimento("0");
      setCliques("0");
      setEntradas("0");
      resetAll();
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
    <div className="mx-auto w-full max-w-[720px] space-y-8">
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

        {selectedExpert && (
          <div className="flex items-center gap-2 text-xs text-muted">
            {btagsLoading && (
              <>
                <Loader2 size={11} className="animate-spin" />
                <span>Carregando BTAGs cadastrados...</span>
              </>
            )}
            {!btagsLoading && !btagsError && expertBtags.size > 0 && (
              <>
                <span className="text-snow/70">BTAGs cadastrados:</span>
                <span className="font-mono text-bingo">
                  {[...expertBtags].sort().join(", ")}
                </span>
              </>
            )}
          </div>
        )}

        {btagsError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded bg-warning/[0.08] px-3 py-2 text-xs text-warning"
            style={{ borderLeft: "3px solid #f59e0b" }}
          >
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>{btagsError}</span>
          </div>
        )}
      </section>

      {/* Upload zone */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-snow">
            Planilhas do dia ({entries.length})
          </label>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="text-xs uppercase tracking-wide text-muted transition-colors hover:text-snow"
            >
              Remover todos
            </button>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors animate-pulse-border ${
            dragOver
              ? "border-bingo bg-bingo/[0.08]"
              : "border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04]"
          }`}
        >
          <UploadIcon size={26} strokeWidth={1.5} className="text-muted" />
          <p className="text-sm text-snow">
            Arraste 1 ou mais planilhas, ou clique pra selecionar
          </p>
          <p className="text-xs text-muted">
            Multi-BTAG · um arquivo por BTAG do expert · .xlsx ou .csv
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {/* Lista de arquivos */}
        {entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry) => {
              const v = entryValidations.get(entry.id) ?? {
                invalidBtags: [],
                isMixed: false,
              };
              const invalid = v.invalidBtags.length > 0;
              const distintos = entry.parsed?.btags_distintos ?? [];
              const borderColor = entry.error
                ? "#ef4444"
                : invalid
                  ? "#ef4444"
                  : entry.parsed
                    ? v.isMixed
                      ? "#f59e0b"
                      : "#ff6b00"
                    : "rgba(255,255,255,0.15)";

              return (
                <div
                  key={entry.id}
                  className="glass relative rounded-xl p-3"
                  style={{ borderLeft: `3px solid ${borderColor}` }}
                >
                  <div className="flex items-start gap-3 pr-8">
                    <FileSpreadsheet
                      size={18}
                      strokeWidth={1.5}
                      className={`mt-0.5 shrink-0 ${invalid ? "text-danger" : "text-bingo"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-snow">
                        {entry.file.name}
                      </p>
                      <p className="font-mono text-xs text-muted">
                        {formatFileSize(entry.file.size)}
                        {entry.parsed && distintos.length > 0 && (
                          <>
                            {" · BTAG "}
                            <span
                              className={
                                invalid ? "text-danger" : "text-snow"
                              }
                            >
                              {distintos
                                .map((b) => `${b.btag} (${b.count})`)
                                .join(", ")}
                            </span>
                            {v.isMixed && (
                              <span className="ml-1 rounded bg-warning/[0.15] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-warning">
                                misto
                              </span>
                            )}
                            {" · "}
                            {formatInt(entry.parsed.total_registros)} reg ·{" "}
                            {formatInt(entry.parsed.total_ftd)} FTD
                            {" · "}data{" "}
                            {formatDateBR(entry.parsed.data_referencia)}
                          </>
                        )}
                      </p>
                      {invalid && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-danger">
                          <AlertCircle
                            size={12}
                            className="mt-0.5 shrink-0"
                          />
                          BTAG(s){" "}
                          <span className="font-mono">
                            {v.invalidBtags.join(", ")}
                          </span>{" "}
                          não pertence(m) a{" "}
                          {selectedExpert?.nome ?? "esse expert"}
                        </p>
                      )}
                      {entry.error && (
                        <p className="mt-1 text-xs text-danger">
                          {entry.error}
                        </p>
                      )}
                      {!entry.parsed && !entry.error && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                          <Loader2 size={10} className="animate-spin" />
                          processando...
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="absolute right-2 top-2 rounded p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
                    aria-label="Remover"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Conflito de datas */}
        {dateConflict && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded bg-danger/[0.08] px-3 py-3 text-sm text-danger"
            style={{ borderLeft: "3px solid #ef4444" }}
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              Datas divergentes entre planilhas:{" "}
              {parsedEntries
                .map(
                  (e) =>
                    `${e.file.name} (${formatDateBR(e.parsed!.data_referencia)})`,
                )
                .join(" · ")}
              . Suba apenas planilhas do mesmo dia.
            </span>
          </div>
        )}

        {/* Aviso geral se houver BTAG inválido */}
        {anyBtagInvalid && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded bg-danger/[0.08] px-3 py-3 text-sm text-danger"
            style={{ borderLeft: "3px solid #ef4444" }}
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              Um ou mais arquivos contém BTAG(s) que não pertencem a{" "}
              {selectedExpert?.nome ?? "esse expert"}. Verifique se o arquivo
              foi exportado corretamente ou se o cadastro de campanhas está
              completo em /gestao.
            </span>
          </div>
        )}

        {/* Preview consolidado */}
        {!dateConflict && parsedEntries.length > 0 && (
          <div className="glass space-y-3 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted">
                Preview consolidado
              </p>
              <p className="font-mono text-xs text-muted">
                Data: {dataReferencia ? formatDateBR(dataReferencia) : "—"}
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/[0.06]">
              <table className="w-full text-xs">
                <thead className="border-b border-white/[0.06] text-left uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Arquivo</th>
                    <th className="px-3 py-2 font-medium">BTAG(s)</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Registros
                    </th>
                    <th className="px-3 py-2 text-right font-medium">FTD</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Depósitos
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono text-snow">
                  {parsedEntries.map((e) => {
                    const v = entryValidations.get(e.id) ?? {
                      invalidBtags: [],
                      isMixed: false,
                    };
                    const invalid = v.invalidBtags.length > 0;
                    const distintos = e.parsed!.btags_distintos;
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-white/[0.04] last:border-b-0"
                      >
                        <td className="truncate px-3 py-2">{e.file.name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={invalid ? "text-danger" : "text-bingo"}
                          >
                            {distintos
                              .map((b) => b.btag)
                              .join(", ") || "—"}
                          </span>
                          {v.isMixed && (
                            <span className="ml-1 text-warning">(misto)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatInt(e.parsed!.total_registros)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatInt(e.parsed!.total_ftd)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          R$ {formatNumber(e.parsed!.total_deposits)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-bingo/[0.06] font-semibold">
                    <td className="px-3 py-2 uppercase tracking-wide text-bingo">
                      Total
                    </td>
                    <td className="px-3 py-2 text-bingo">
                      {parsedEntries.length} arquivo
                      {parsedEntries.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatInt(totals.registros)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatInt(totals.ftd)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      R$ {formatNumber(totals.deposits)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
              NGR consolidado: R$ {formatNumber(totals.ngr)}
            </p>
          </div>
        )}
      </section>

      {/* Métricas Manuais — 1x global do dia */}
      {parsedEntries.length > 0 && !dateConflict && !anyBtagInvalid && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-snow">
              Métricas Manuais (totais do dia)
            </h3>
            <p className="text-xs text-muted">
              Valores únicos pro expert no dia inteiro. Não preenchemos por
              BTAG.
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
        {submitting ? "Salvando..." : "Salvar consolidado"}
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
