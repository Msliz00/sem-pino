"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Loader2,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { ExpertOption } from "@/components/CriativoForm";

type DriveItem = { nome: string; drive_url: string };

type ListResult = {
  folder_name: string;
  total_encontrados: number;
  novos: DriveItem[];
  duplicados: DriveItem[];
};

function todayYMD(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function isDriveFolderUrl(url: string): boolean {
  return /folders\/[a-zA-Z0-9_-]+/.test(url);
}

export function DriveImportForm({ experts }: { experts: ExpertOption[] }) {
  const router = useRouter();
  const [expertId, setExpertId] = useState<string>(experts[0]?.id ?? "");
  const [folderUrl, setFolderUrl] = useState("");
  const [dataCriacao, setDataCriacao] = useState(todayYMD());

  const [listing, setListing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [result, setResult] = useState<ListResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const urlInvalid = folderUrl.length > 0 && !isDriveFolderUrl(folderUrl);
  const canList = !!expertId && !!folderUrl && !urlInvalid && !!dataCriacao;

  const handleList = async () => {
    setListing(true);
    setListError(null);
    setResult(null);
    setSelected(new Set());
    setImportSuccess(null);
    setImportError(null);

    try {
      const res = await fetch("/api/criativos/import-drive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          folder_url: folderUrl.trim(),
          expert_id: expertId,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao listar");
      const r = d as ListResult;
      setResult(r);
      // marca todos os novos por padrão
      setSelected(new Set(r.novos.map((n) => n.drive_url)));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setListing(false);
    }
  };

  const toggle = (driveUrl: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(driveUrl)) next.delete(driveUrl);
      else next.add(driveUrl);
      return next;
    });
  };

  const handleImport = async () => {
    if (!result || selected.size === 0) return;
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    const allItems = [...result.novos, ...result.duplicados];
    const items = allItems.filter((it) => selected.has(it.drive_url));

    try {
      const res = await fetch("/api/criativos/import-drive/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          criativos: items,
          expert_id: expertId,
          data_criacao: dataCriacao,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao importar");
      const n = d.inserted ?? items.length;
      setImportSuccess(`${n} criativo${n === 1 ? "" : "s"} importado${n === 1 ? "" : "s"}`);
      setTimeout(() => {
        router.push("/criativos");
      }, 1200);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[700px] space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-snow">
          Cadastro em massa via Google Drive
        </h2>
        <div className="flex items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0 text-bingo" />
          <span>
            Cole a URL de uma subpasta do Drive. Apenas os arquivos diretos
            serão importados (sem recursão).
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-snow">Expert</label>
          <select
            value={expertId}
            onChange={(e) => setExpertId(e.target.value)}
            disabled={listing || importing}
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-snow">URL da pasta</label>
          <input
            type="text"
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            disabled={listing || importing}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-snow placeholder:text-[#71717a] outline-none transition-colors focus:border-bingo"
          />
          {urlInvalid && (
            <p className="text-xs text-warning">
              URL não parece ser de pasta do Drive
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-snow">
            Data de criação
          </label>
          <input
            type="date"
            value={dataCriacao}
            onChange={(e) => setDataCriacao(e.target.value)}
            disabled={listing || importing}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-snow outline-none transition-colors focus:border-bingo"
          />
        </div>

        <button
          type="button"
          onClick={handleList}
          disabled={!canList || listing}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-snow transition-all hover:border-white/[0.2] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {listing && <Loader2 size={14} className="animate-spin" />}
          {listing ? "Listando..." : "Listar arquivos"}
        </button>

        {listError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded bg-danger/[0.08] px-3 py-3 text-sm text-danger"
            style={{ borderLeft: "3px solid #ef4444" }}
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{listError}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted">
              Pasta
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs text-snow">
              {result.folder_name}
            </span>
            <span className="text-xs text-muted">
              · {result.total_encontrados} arquivo
              {result.total_encontrados === 1 ? "" : "s"}
            </span>
          </div>

          {result.total_encontrados === 0 && (
            <p className="rounded border-l-2 border-warning bg-warning/[0.08] px-3 py-2 text-sm text-warning">
              Pasta vazia (ou só com subpastas).
            </p>
          )}

          {result.novos.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-success/40 bg-success/[0.15] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                  Novos
                </span>
                <span className="text-sm text-muted">
                  ({result.novos.length})
                </span>
              </div>
              <ul className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface">
                {result.novos.map((item) => (
                  <li
                    key={item.drive_url}
                    className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(item.drive_url)}
                      onChange={() => toggle(item.drive_url)}
                      className="h-4 w-4 cursor-pointer accent-bingo"
                    />
                    <span className="flex-1 truncate text-sm text-snow">
                      {item.nome}
                    </span>
                    {item.drive_url && (
                      <a
                        href={item.drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-snow"
                      >
                        abrir no Drive
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.duplicados.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-bingo/40 bg-bingo/[0.15] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bingo">
                  Duplicados
                </span>
                <span className="text-sm text-muted">
                  ({result.duplicados.length})
                </span>
              </div>
              <ul className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface">
                {result.duplicados.map((item) => (
                  <li
                    key={item.drive_url}
                    className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(item.drive_url)}
                      onChange={() => toggle(item.drive_url)}
                      className="h-4 w-4 cursor-pointer accent-bingo"
                    />
                    <span className="flex-1 truncate text-sm text-snow">
                      {item.nome}
                    </span>
                    <span className="rounded-full border border-bingo/40 bg-bingo/[0.15] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-bingo">
                      Já existe
                    </span>
                    {item.drive_url && (
                      <a
                        href={item.drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-snow"
                      >
                        abrir
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.total_encontrados > 0 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-bingo-gradient px-3 py-3 text-sm font-medium text-ink transition-all hover:shadow-[0_0_24px_-4px_rgba(255,107,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              {importing
                ? "Importando..."
                : `Importar ${selected.size} selecionado${selected.size === 1 ? "" : "s"}`}
            </button>
          )}

          {importError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded bg-danger/[0.08] px-3 py-3 text-sm text-danger"
              style={{ borderLeft: "3px solid #ef4444" }}
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div
              role="status"
              className="flex items-start gap-2 rounded bg-success/[0.08] px-3 py-3 text-sm text-success"
              style={{ borderLeft: "3px solid #22c55e" }}
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
