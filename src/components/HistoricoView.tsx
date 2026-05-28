"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useExpertFilter } from "@/contexts/ExpertFilterContext";
import { EditUploadModal } from "@/components/EditUploadModal";

export type MarcaDominante = "BINGO" | "REALS" | "MISTA" | null;

export type HistoricoUpload = {
  id: string;
  data_referencia: string;
  investimento: number;
  cliques: number;
  entradas_grupo: number;
  total_registros: number;
  total_ftd: number;
  total_deposits: number;
  total_withdrawn: number;
  total_net_deposits: number;
  total_wagering: number;
  distribuicao_origens: Record<string, { registros: number; ftd: number }>;
  arquivo_nome: string | null;
  uploaded_at: string;
  expert: {
    id: string;
    slug: string;
    nome: string;
    marca_dominante: MarcaDominante;
  } | null;
};

type MarcaFiltro = "todas" | "BINGO" | "REALS";

const PER_PAGE = 20;

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

function ymdNDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function badgeClasses(marca: MarcaDominante): string {
  if (marca === "BINGO") {
    return "bg-bingo-gradient text-ink";
  }
  if (marca === "REALS") {
    return "border border-reals/40 bg-reals/[0.15] text-reals";
  }
  return "border border-white/[0.08] bg-white/[0.05] text-muted";
}

export function HistoricoView() {
  const { expertSelecionado, setExpertSelecionado } = useExpertFilter();
  const [marca, setMarca] = useState<MarcaFiltro>("todas");
  const [dataInicio, setDataInicio] = useState(ymdNDaysAgo(30));
  const [dataFim, setDataFim] = useState(ymdNDaysAgo(0));
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<HistoricoUpload[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editing, setEditing] = useState<HistoricoUpload | null>(null);

  // resetar pagina quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [expertSelecionado, marca, dataInicio, dataFim]);

  const fetchData = () => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({
      expert: expertSelecionado,
      marca,
      data_inicio: dataInicio,
      data_fim: dataFim,
      page: String(page),
      per_page: String(PER_PAGE),
    });
    fetch(`/api/historico?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setFetchError(d.error);
          setRows([]);
          setTotal(0);
        } else {
          setRows(d.data ?? []);
          setTotal(d.total ?? 0);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setFetchError(e instanceof Error ? e.message : "Erro de rede");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cleanup = fetchData();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertSelecionado, marca, dataInicio, dataFim, page]);

  const clearFilters = () => {
    setExpertSelecionado("todos");
    setMarca("todas");
    setDataInicio(ymdNDaysAgo(30));
    setDataFim(ymdNDaysAgo(0));
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="glass-strong sticky top-[60px] z-[5] -mx-10 px-10 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Marca
            </label>
            <select
              value={marca}
              onChange={(e) => setMarca(e.target.value as MarcaFiltro)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-bingo"
            >
              <option value="todas" className="bg-surface">
                Todas
              </option>
              <option value="BINGO" className="bg-surface">
                BINGO
              </option>
              <option value="REALS" className="bg-surface">
                REALS
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              De
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-bingo"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Até
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-bingo"
            />
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.08] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Expert</th>
              <th className="px-4 py-3 font-medium text-right">Registros</th>
              <th className="px-4 py-3 font-medium text-right">FTD</th>
              <th className="px-4 py-3 font-medium text-right">Investimento</th>
              <th className="px-4 py-3 font-medium text-right">NGR</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  <Loader2
                    size={18}
                    className="mx-auto animate-spin text-muted"
                  />
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && !fetchError && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Nenhum upload encontrado pros filtros aplicados
                </td>
              </tr>
            )}

            {fetchError && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-danger">
                  {fetchError}
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]"
              >
                <td className="px-4 py-3 font-mono text-snow">
                  {formatDateBR(row.data_referencia)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-snow">
                      {row.expert?.nome ?? "—"}
                    </span>
                    {row.expert && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClasses(row.expert.marca_dominante)}`}
                      >
                        {row.expert.marca_dominante ?? "—"}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-snow">
                  {formatNumber(row.total_registros)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-snow">
                  {formatNumber(row.total_ftd)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-snow">
                  {formatMoney(row.investimento)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-snow">
                  {formatMoney(row.total_net_deposits)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {row.arquivo_nome && (
                      <a
                        href={`/api/uploads/${row.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
                        aria-label="Baixar planilha"
                      >
                        <Download size={16} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      className="rounded p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
                      aria-label="Editar upload"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {total} resultado{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            Anterior
          </button>
          <span className="px-2 font-mono text-xs text-muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próximo
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <EditUploadModal
        upload={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          fetchData();
        }}
      />
    </div>
  );
}
