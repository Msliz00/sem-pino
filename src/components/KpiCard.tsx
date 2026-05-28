"use client";

import { useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Variacao } from "@/lib/metricas";

export type Formato = "numero" | "moeda" | "percentual";

type Props = {
  label: string;
  value: number | null;
  formato: Formato;
  variacao: Variacao;
};

function formatValue(value: number | null, formato: Formato): string {
  if (value === null) return "—";
  if (formato === "moeda") {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
  if (formato === "percentual") {
    return (
      value.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + "%"
    );
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function KpiCard({ label, value, formato, variacao }: Props) {
  const { pct, sinal } = variacao;
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  const hintClass =
    sinal === "up"
      ? "kpi-hint kpi-hint--up"
      : sinal === "down"
        ? "kpi-hint kpi-hint--down"
        : "kpi-hint";

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className="glass glass-spotlight rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:border-white/[0.18] hover:shadow-[0_0_60px_-10px_rgba(255,107,0,0.45)]"
    >
      <div className="relative z-[1]">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{formatValue(value, formato)}</div>
        <div className={hintClass}>
          {sinal === "up" && pct !== null && (
            <>
              <TrendingUp size={11} />
              <span>{formatPct(pct)} vs anterior</span>
            </>
          )}
          {sinal === "down" && pct !== null && (
            <>
              <TrendingDown size={11} />
              <span>{formatPct(pct)} vs anterior</span>
            </>
          )}
          {(sinal === "neutral" || pct === null) && (
            <span>vs período anterior</span>
          )}
        </div>
      </div>
    </div>
  );
}
