"use client";

import { useEffect, useRef, useState } from "react";
import { useExpertFilter } from "@/contexts/ExpertFilterContext";
import { KpiCard, type Formato } from "@/components/KpiCard";
import {
  calcVariacao,
  type MetricasCalculadas,
} from "@/lib/metricas";

type CardKey = keyof MetricasCalculadas;

const CARDS: { key: CardKey; label: string; formato: Formato }[] = [
  // Linha 1
  { key: "investimento", label: "Investimento", formato: "moeda" },
  { key: "cliques", label: "Cliques", formato: "numero" },
  { key: "entradas", label: "Entradas", formato: "numero" },
  { key: "registros", label: "Registros", formato: "numero" },
  { key: "ftd", label: "FTD", formato: "numero" },
  // Linha 2
  { key: "custoRegistro", label: "Custo/Registro", formato: "moeda" },
  { key: "cpc", label: "CPC", formato: "moeda" },
  { key: "custoLead", label: "Custo/Lead", formato: "moeda" },
  { key: "ticketMedio", label: "Ticket Médio", formato: "moeda" },
  { key: "deposito", label: "Depósito", formato: "moeda" },
  // Linha 3
  { key: "pctCliqueEntrada", label: "% Clique→Entrada", formato: "percentual" },
  { key: "pctRegFtd", label: "% Reg→FTD", formato: "percentual" },
  { key: "pctEntradaFtd", label: "% Entrada→FTD", formato: "percentual" },
  { key: "ngr", label: "NGR", formato: "moeda" },
  { key: "pctDepositoNgr", label: "% Depósito→NGR", formato: "percentual" },
];

const EXPERT_LABELS: Record<string, string> = {
  todos: "Todos",
  professor: "Professor",
  "iris-aviator": "Iris Aviator",
};

export type DashboardData = {
  hoje: MetricasCalculadas;
  ontem: MetricasCalculadas | null;
  dataReferencia: string | null;
  hasData: boolean;
};

function formatDateBR(ymd: string | null): string {
  if (!ymd) return "—";
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function DashboardGrid({ initial }: { initial: DashboardData }) {
  const { expertSelecionado } = useExpertFilter();
  const [data, setData] = useState<DashboardData>(initial);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard?expert=${encodeURIComponent(expertSelecionado)}`)
      .then((r) => r.json())
      .then((d: DashboardData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // ignora — mantém dados atuais
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expertSelecionado]);

  return (
    <div className="space-y-6">
      <p className="font-mono text-sm text-muted">
        Dados de {formatDateBR(data.dataReferencia)}
      </p>

      {!data.hasData && (
        <div
          className="rounded bg-warning/[0.08] px-3 py-2 text-sm text-warning"
          style={{ borderLeft: "3px solid #f59e0b" }}
        >
          Sem uploads pra {EXPERT_LABELS[expertSelecionado] ?? expertSelecionado}{" "}
          em {formatDateBR(data.dataReferencia)}. Faça upload na aba Upload.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="h-[120px] animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.02]"
              />
            ))
          : CARDS.map((card) => {
              const atual = data.hoje[card.key];
              const anterior = data.ontem?.[card.key] ?? null;
              return (
                <KpiCard
                  key={card.key}
                  label={card.label}
                  value={atual}
                  formato={card.formato}
                  variacao={calcVariacao(atual, anterior)}
                />
              );
            })}
      </div>
    </div>
  );
}
