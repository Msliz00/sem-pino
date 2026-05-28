"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import {
  CampanhaModal,
  type CampanhaDraft,
} from "@/components/CampanhaModal";

type ExpertOption = { id: string; nome: string };

type CampanhaRow = {
  id: string;
  nome: string;
  marca: "BINGO" | "REALS";
  codigo_ux: string | null;
  affiliate_id: string | null;
  expert_id: string | null;
  experts: { id: string; slug: string; nome: string } | null;
};

function badgeClasses(marca: "BINGO" | "REALS"): string {
  if (marca === "BINGO") return "bg-bingo-gradient text-ink";
  return "border border-reals/40 bg-reals/[0.15] text-reals";
}

export function CampanhasSection({
  experts,
  reloadExperts,
}: {
  experts: ExpertOption[];
  reloadExperts: () => void;
}) {
  const router = useRouter();
  const [filtroExpert, setFiltroExpert] = useState<string>("todos");
  const [campanhas, setCampanhas] = useState<CampanhaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CampanhaDraft | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<CampanhaRow | null>(null);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroExpert !== "todos") params.set("expert_id", filtroExpert);
      const res = await fetch(`/api/campanhas?${params.toString()}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro");
      setCampanhas(d.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroExpert]);

  const openNew = () => {
    setEditing({
      id: null,
      nome: "",
      marca: "BINGO",
      expert_id: experts[0]?.id ?? "",
      codigo_ux: "",
      affiliate_id: "",
    });
    setModalOpen(true);
  };

  const openEdit = (c: CampanhaRow) => {
    setEditing({
      id: c.id,
      nome: c.nome,
      marca: c.marca,
      expert_id: c.expert_id ?? "",
      codigo_ux: c.codigo_ux ?? "",
      affiliate_id: c.affiliate_id ?? "",
    });
    setModalOpen(true);
  };

  const handleSaved = async () => {
    setModalOpen(false);
    setEditing(null);
    await fetchData();
    reloadExperts();
    router.refresh();
  };

  const requestDelete = (c: CampanhaRow) => {
    setConfirmDelete(c);
    setConfirmDeleteStep(1);
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
    setConfirmDeleteStep(1);
  };

  const performDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setOpError(null);
    try {
      const res = await fetch(`/api/campanhas/${confirmDelete.id}`, {
        method: "DELETE",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erro");
      cancelDelete();
      await fetchData();
      reloadExperts();
      router.refresh();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold text-snow">Campanhas</h2>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted">
              Expert
            </label>
            <select
              value={filtroExpert}
              onChange={(e) => setFiltroExpert(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-bingo"
            >
              <option value="todos" className="bg-surface">
                Todos
              </option>
              {experts.map((e) => (
                <option key={e.id} value={e.id} className="bg-surface">
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={openNew}
            disabled={experts.length === 0}
            className="btn-shine flex items-center gap-2 rounded-lg bg-bingo-gradient px-3 py-2 text-sm font-medium text-ink transition-all hover:shadow-[0_0_24px_-4px_rgba(255,107,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} />
            Nova Campanha
          </button>
        </div>
      </div>

      {opError && (
        <p
          role="alert"
          className="rounded border-l-2 border-danger bg-danger/[0.08] px-3 py-2 text-sm text-danger"
        >
          {opError}
        </p>
      )}

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.08] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Código UX</th>
              <th className="px-4 py-3 font-medium">Affiliate ID</th>
              <th className="px-4 py-3 font-medium">Expert</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && campanhas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  <Loader2 size={18} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {!loading && campanhas.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Nenhuma campanha cadastrada
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-danger">
                  {error}
                </td>
              </tr>
            )}
            {campanhas.map((c) => (
              <tr
                key={c.id}
                className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 text-snow">{c.nome}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClasses(c.marca)}`}
                  >
                    {c.marca}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-muted">
                  {c.codigo_ux ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-muted">
                  {c.affiliate_id ?? "—"}
                </td>
                <td className="px-4 py-3 text-snow">
                  {c.experts?.nome ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="rounded p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
                      aria-label="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(c)}
                      className="rounded p-1.5 text-muted transition-colors hover:bg-danger/[0.15] hover:text-danger"
                      aria-label="Deletar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CampanhaModal
        open={modalOpen}
        initial={editing}
        experts={experts}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/[0.08] bg-surface p-6 shadow-2xl">
            {confirmDeleteStep === 1 ? (
              <>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-snow">
                    Deletar campanha
                  </h3>
                  <p className="text-sm text-muted">
                    Deletar{" "}
                    <span className="text-snow">{confirmDelete.nome}</span>?
                    Essa ação não pode ser desfeita.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelDelete}
                    disabled={deleting}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteStep(2)}
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
                    onClick={cancelDelete}
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
    </section>
  );
}
