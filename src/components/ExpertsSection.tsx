"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Pencil,
  Power,
  Plus,
  Loader2,
} from "lucide-react";
import { ExpertModal, type ExpertDraft } from "@/components/ExpertModal";

export type ExpertRow = {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
  ordem: number;
  campanhas_count: number;
};

function SortableRow({
  expert,
  onEdit,
  onToggleAtivo,
  togglingId,
}: {
  expert: ExpertRow;
  onEdit: (e: ExpertRow) => void;
  onToggleAtivo: (e: ExpertRow) => void;
  togglingId: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: expert.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const toggling = togglingId === expert.id;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
    >
      <td className="px-4 py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Reordenar"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-4 py-3 text-snow">{expert.nome}</td>
      <td className="px-4 py-3 font-mono text-sm text-muted">{expert.slug}</td>
      <td className="px-4 py-3 text-right font-mono text-snow">
        {expert.campanhas_count}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            expert.ativo
              ? "border border-success/40 bg-success/[0.15] text-success"
              : "border border-white/[0.08] bg-white/[0.05] text-muted"
          }`}
        >
          {expert.ativo ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(expert)}
            className="rounded p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
            aria-label="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onToggleAtivo(expert)}
            disabled={toggling}
            className="rounded p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow disabled:opacity-50"
            aria-label={expert.ativo ? "Desativar" : "Reativar"}
          >
            {toggling ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Power size={16} />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ExpertsSection({ onChange }: { onChange: () => void }) {
  const router = useRouter();
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpertDraft | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/experts?incluir_inativos=${mostrarInativos}`,
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro");
      setExperts(d.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInativos]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = experts.findIndex((e) => e.id === active.id);
    const newIdx = experts.findIndex((e) => e.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const newOrder = arrayMove(experts, oldIdx, newIdx).map((e, i) => ({
      ...e,
      ordem: i + 1,
    }));
    setExperts(newOrder);

    try {
      const res = await fetch("/api/experts/reordenar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ordem: newOrder.map((e) => ({ id: e.id, ordem: e.ordem })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erro ao reordenar");
      }
      router.refresh();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : "Erro de rede");
      fetchData();
    }
  };

  const handleToggleAtivo = async (e: ExpertRow) => {
    setTogglingId(e.id);
    setOpError(null);
    try {
      const res = await fetch(`/api/experts/${e.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ativo: !e.ativo }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro");
      await fetchData();
      onChange();
      router.refresh();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setTogglingId(null);
    }
  };

  const openNew = () => {
    setEditing({ id: null, nome: "", slug: "" });
    setModalOpen(true);
  };

  const openEdit = (e: ExpertRow) => {
    setEditing({ id: e.id, nome: e.nome, slug: e.slug });
    setModalOpen(true);
  };

  const handleSaved = async () => {
    setModalOpen(false);
    setEditing(null);
    await fetchData();
    onChange();
    router.refresh();
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-snow">Experts</h2>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-bingo"
            />
            Mostrar inativos
          </label>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-bingo-gradient px-3 py-2 text-sm font-medium text-ink transition-all hover:shadow-[0_0_24px_-4px_rgba(255,107,0,0.6)]"
          >
            <Plus size={14} />
            Novo Expert
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

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.08] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium" style={{ width: 40 }} />
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium text-right">Campanhas</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && experts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  <Loader2 size={18} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {!loading && experts.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Nenhum expert cadastrado
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={experts.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                {experts.map((e) => (
                  <SortableRow
                    key={e.id}
                    expert={e}
                    onEdit={openEdit}
                    onToggleAtivo={handleToggleAtivo}
                    togglingId={togglingId}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </tbody>
        </table>
      </div>

      <ExpertModal
        open={modalOpen}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />
    </section>
  );
}
