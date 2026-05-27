import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.15]">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-3 font-mono text-3xl font-semibold leading-tight text-snow">
        {formatValue(value, formato)}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs">
        {sinal === "up" && pct !== null && (
          <>
            <TrendingUp size={12} className="text-success" />
            <span className="text-success">{formatPct(pct)}</span>
          </>
        )}
        {sinal === "down" && pct !== null && (
          <>
            <TrendingDown size={12} className="text-danger" />
            <span className="text-danger">{formatPct(pct)}</span>
          </>
        )}
        {(sinal === "neutral" || pct === null) && (
          <>
            <Minus size={12} className="text-muted" />
            <span className="text-muted">—</span>
          </>
        )}
      </div>
    </div>
  );
}
