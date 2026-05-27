"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { useExpertFilter } from "@/contexts/ExpertFilterContext";
import { CriativoCard, type Criativo } from "@/components/CriativoCard";
import {
  CriativoEditModal,
  type CriativoEditDraft,
} from "@/components/CriativoEditModal";
import { STATUSES } from "@/lib/criativos-validations";

type StatusFiltro = "todos" | "ATIVO" | "DESCARTE" | "PENDENTE";

function ymdNDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function CriativosView() {
  const { expertSelecionado, setExpertSelecionado } = useExpertFilter();

  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [dataInicio, setDataInicio] = useState(ymdNDaysAgo(30));
  const [dataFim, setDataFim] = useState(ymdNDaysAgo(0));

  const [rows, setRows] = useState<Criativo[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editing, setEditing] = useState<CriativoEditDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Criativo | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({
      expert: expertSelecionado,
      data_inicio: dataInicio,
      data_fim: dataFim,
    });
    if (status !== "todos") params.set("status", status);
    try {
      const res = await fetch(`/api/criativos?${params.toString()}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro");
      setRows(d.data ?? []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }, [expertSelecionado, status, dataInicio, dataFim]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setExpertSelecionado("todos");
    setStatus("todos");
    setDataInicio(ymdNDaysAgo(30));
    setDataFim(ymdNDaysAgo(0));
  };

  const exportUrl = (() => {
    const params = new URLSearchParams({
      expert: expertSelecionado,
      data_inicio: dataInicio,
      data_fim: dataFim,
    });
    if (status !== "todos") params.set("status", status);
    return `/api/criativos/export?${params.toString()}`;
  })();

  const openEdit = (c: Criativo) => {
    setEditing({
      id: c.id,
      nome: c.nome,
      data_criacao: c.data_criacao,
      expert_id: c.expert?.id ?? "",
      status: c.status,
      drive_url: c.drive_url ?? "",
      meta_ad_id: c.meta_ad_id ?? "",
      destination_url: c.destination_url ?? "",
    });
  };

  const handleUpdatedFromCard = (updated: Criativo) => {
    setRows((rs) =>
      rs.map((r) =>
        r.id === updated.id ? { ...r, ...updated, expert: r.expert } : r,
      ),
    );
  };

  const requestDelete = (c: Criativo) => {
    setConfirmDelete(c);
    setConfirmStep(1);
  };

  const performDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/criativos/${confirmDelete.id}`, {
        method: "DELETE",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erro");
      setConfirmDelete(null);
      setConfirmStep(1);
      await fetchData();
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Erro ao deletar");
    } finally {
      setDeleting(false);
    }
  };

  // O context só expõe slug+nome dos experts ativos. O CriativoEditModal
  // espera id; busca a lista completa via /api/experts uma vez.
  const [expertsFullList, setExpertsFullList] = useState<
    { id: string; nome: string }[]
  >([]);
  useEffect(() => {
    fetch("/api/experts?incluir_inativos=true")
      .then((r) => r.json())
      .then((d) =>
        setExpertsFullList(
          (d.data ?? []).map((e: { id: string; nome: string }) => ({
            id: e.id,
            nome: e.nome,
          })),
        ),
      )
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="sticky top-[60px] z-[5] -mx-10 border-b border-white/[0.08] bg-[rgba(8,7,10,0.7)] px-10 py-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFiltro)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-bingo"
            >
              <option value="todos" className="bg-surface">
                Todos
              </option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-surface">
                  {s}
                </option>
              ))}
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

          <div className="ml-auto flex items-end gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
            >
              Limpar filtros
            </button>
            <a
              href={exportUrl}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow transition-colors hover:border-white/[0.2] hover:bg-white/[0.06]"
            >
              <Download size={14} />
              Extrair Relatório
            </a>
          </div>
        </div>
      </div>

      {fetchError && (
        <p
          role="alert"
          className="rounded border-l-2 border-danger bg-danger/[0.08] px-3 py-2 text-sm text-danger"
        >
          {fetchError}
        </p>
      )}

      {loading && rows.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      )}

      {!loading && rows.length === 0 && !fetchError && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-surface py-20 text-center">
          <p className="text-sm text-muted">
            Nenhum criativo cadastrado pros filtros aplicados
          </p>
          <Link
            href="/upload?tab=criativos"
            className="rounded-lg bg-bingo-gradient px-4 py-2 text-sm font-medium text-ink transition-all hover:shadow-[0_0_24px_-4px_rgba(255,107,0,0.6)]"
          >
            Cadastrar primeiro criativo
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <CriativoCard
              key={c.id}
              criativo={c}
              onEdit={openEdit}
              onDelete={requestDelete}
              onUpdated={handleUpdatedFromCard}
            />
          ))}
        </div>
      )}

      <CriativoEditModal
        open={!!editing}
        initial={editing}
        experts={expertsFullList}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await fetchData();
        }}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/[0.08] bg-surface p-6 shadow-2xl">
            {confirmStep === 1 ? (
              <>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-snow">
                    Deletar criativo
                  </h3>
                  <p className="text-sm text-muted">
                    Deletar{" "}
                    <span className="text-snow">{confirmDelete.nome}</span>?
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    disabled={deleting}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    disabled={deleting}
                    className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-snow transition-colors hover:bg-danger/90 disabled:opacity-50"
                  >
                    Deletar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-snow">
                    Confirmar exclusão
                  </h3>
                  <p className="text-sm text-muted">
                    Tem certeza? Esta ação é permanente.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(null);
                      setConfirmStep(1);
                    }}
                    disabled={deleting}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow disabled:opacity-50"
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={performDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-snow transition-colors hover:bg-danger/90 disabled:opacity-50"
                  >
                    {deleting && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    {deleting ? "Deletando..." : "Sim, deletar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
