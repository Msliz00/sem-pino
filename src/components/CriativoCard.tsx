"use client";

import { useEffect, useRef, useState } from "react";
import {
  Pencil,
  Trash2,
  HardDrive,
  Megaphone,
  ExternalLink,
  Check,
  Loader2,
} from "lucide-react";
import {
  METRIC_FIELDS,
  isValidMetaAdId,
  type MetricField,
} from "@/lib/criativos-validations";

export type Criativo = {
  id: string;
  nome: string;
  data_criacao: string;
  status: "ATIVO" | "DESCARTE" | "PENDENTE";
  drive_url: string | null;
  meta_ad_id: string | null;
  destination_url: string | null;
  thumbstop: number;
  hold_rate: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequencia: number;
  alcance: number;
  impressoes: number;
  cliques: number;
  investimento: number;
  cpa: number;
  expert: {
    id: string;
    slug: string;
    nome: string;
    marca_dominante: "BINGO" | "REALS" | "MISTA" | null;
  } | null;
};

type Format = "percent" | "currency" | "number" | "decimal";

const METRIC_META: Record<MetricField, { label: string; format: Format }> = {
  thumbstop: { label: "ThumbStop", format: "percent" },
  hold_rate: { label: "HoldRate", format: "percent" },
  ctr: { label: "CTR", format: "percent" },
  cpm: { label: "CPM", format: "currency" },
  cpc: { label: "CPC", format: "currency" },
  frequencia: { label: "Frequência", format: "decimal" },
  alcance: { label: "Alcance", format: "number" },
  impressoes: { label: "Impressões", format: "number" },
  cliques: { label: "Cliques", format: "number" },
  investimento: { label: "Investimento", format: "currency" },
  cpa: { label: "CPA", format: "currency" },
};

function statusClasses(s: Criativo["status"]) {
  if (s === "ATIVO")
    return "border border-success/40 bg-success/[0.15] text-success";
  if (s === "DESCARTE")
    return "border border-danger/40 bg-danger/[0.15] text-danger";
  return "border border-warning/40 bg-warning/[0.15] text-warning";
}

function badgeMarca(marca: Criativo["expert"] extends infer T
  ? T extends { marca_dominante: infer M }
    ? M
    : never
  : never): string {
  if (marca === "BINGO") return "bg-bingo-gradient text-ink";
  if (marca === "REALS")
    return "border border-reals/40 bg-reals/[0.15] text-reals";
  return "border border-white/[0.08] bg-white/[0.05] text-muted";
}

function formatDateBR(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}`;
}

type SaveState = "idle" | "saving" | "saved";

type Props = {
  criativo: Criativo;
  onEdit: (c: Criativo) => void;
  onDelete: (c: Criativo) => void;
  onUpdated: (c: Criativo) => void;
};

export function CriativoCard({ criativo, onEdit, onDelete, onUpdated }: Props) {
  const [values, setValues] = useState<Record<MetricField, string>>(() => {
    const out = {} as Record<MetricField, string>;
    for (const f of METRIC_FIELDS as readonly MetricField[]) {
      out[f] = String(criativo[f] ?? 0);
    }
    return out;
  });
  const [states, setStates] = useState<Record<MetricField, SaveState>>(() => {
    const out = {} as Record<MetricField, SaveState>;
    for (const f of METRIC_FIELDS as readonly MetricField[]) out[f] = "idle";
    return out;
  });
  const timers = useRef<Partial<Record<MetricField, ReturnType<typeof setTimeout>>>>(
    {},
  );
  const savedTimers = useRef<
    Partial<Record<MetricField, ReturnType<typeof setTimeout>>>
  >({});

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => t && clearTimeout(t));
      Object.values(savedTimers.current).forEach((t) => t && clearTimeout(t));
    };
  }, []);

  const triggerSave = (field: MetricField, raw: string) => {
    const num = Number(raw);
    if (Number.isNaN(num) || num < 0) return;

    setStates((s) => ({ ...s, [field]: "saving" }));
    fetch(`/api/criativos/${criativo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: num }),
    })
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error ?? "Erro");
        if (d.criativo) onUpdated(d.criativo as Criativo);
        setStates((s) => ({ ...s, [field]: "saved" }));
        if (savedTimers.current[field]) {
          clearTimeout(savedTimers.current[field]!);
        }
        savedTimers.current[field] = setTimeout(() => {
          setStates((s) => ({ ...s, [field]: "idle" }));
        }, 1000);
      })
      .catch(() => {
        setStates((s) => ({ ...s, [field]: "idle" }));
      });
  };

  const handleChange = (field: MetricField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (timers.current[field]) clearTimeout(timers.current[field]!);
    timers.current[field] = setTimeout(() => triggerSave(field, value), 500);
  };

  const driveDisabled = !criativo.drive_url;
  const metaValid = !!criativo.meta_ad_id && isValidMetaAdId(criativo.meta_ad_id);
  const metaDisabled = !metaValid;
  const destDisabled = !criativo.destination_url;

  const metaHref = metaValid
    ? `https://www.facebook.com/ads/library/?id=${criativo.meta_ad_id}`
    : undefined;

  return (
    <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-surface p-5 transition-all hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <h3 className="truncate text-base font-semibold text-snow">
            {criativo.nome}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(criativo.status)}`}
          >
            {criativo.status}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(criativo)}
            className="rounded p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
            aria-label="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(criativo)}
            className="rounded p-1.5 text-muted transition-colors hover:bg-danger/[0.15] hover:text-danger"
            aria-label="Deletar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="font-mono text-muted">
          {formatDateBR(criativo.data_criacao)}
        </span>
        {criativo.expert && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeMarca(criativo.expert.marca_dominante)}`}
          >
            {criativo.expert.nome}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(METRIC_FIELDS as readonly MetricField[]).map((f) => {
          const meta = METRIC_META[f];
          const state = states[f];
          return (
            <div key={f} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-muted">
                  {meta.label}
                </span>
                {state === "saving" && (
                  <Loader2 size={10} className="animate-spin text-muted" />
                )}
                {state === "saved" && (
                  <Check size={10} className="text-success" />
                )}
              </div>
              <div className="flex items-center gap-1 rounded border border-transparent border-b-white/[0.08] bg-transparent transition-colors focus-within:border-b-bingo">
                {meta.format === "currency" && (
                  <span className="pl-1 text-[10px] text-muted">R$</span>
                )}
                <input
                  type="number"
                  step={meta.format === "number" ? "1" : "0.01"}
                  min="0"
                  value={values[f]}
                  onChange={(e) => handleChange(f, e.target.value)}
                  className="w-full bg-transparent py-1 pr-1 font-mono text-xs text-snow outline-none"
                />
                {meta.format === "percent" && (
                  <span className="pr-1 text-[10px] text-muted">%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2">
        {driveDisabled ? (
          <span className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-2 text-xs text-muted opacity-40">
            <HardDrive size={12} />
            DRIVE
          </span>
        ) : (
          <a
            href={criativo.drive_url!}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-2 text-xs text-snow transition-colors hover:border-white/[0.2] hover:bg-white/[0.05]"
          >
            <HardDrive size={12} />
            DRIVE
          </a>
        )}

        {metaDisabled ? (
          <span className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-2 text-xs text-muted opacity-40">
            <Megaphone size={12} />
            META
          </span>
        ) : (
          <a
            href={metaHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-2 text-xs text-snow transition-colors hover:border-white/[0.2] hover:bg-white/[0.05]"
          >
            <Megaphone size={12} />
            META
          </a>
        )}

        {destDisabled ? (
          <span className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-2 text-xs text-muted opacity-40">
            <ExternalLink size={12} />
            DESTINO
          </span>
        ) : (
          <a
            href={criativo.destination_url!}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-2 text-xs text-snow transition-colors hover:border-white/[0.2] hover:bg-white/[0.05]"
          >
            <ExternalLink size={12} />
            DESTINO
          </a>
        )}
      </div>
    </div>
  );
}
