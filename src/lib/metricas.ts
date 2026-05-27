export interface MetricasInputs {
  investimento: number;
  cliques: number;
  entradas_grupo: number;
  total_registros: number;
  total_ftd: number;
  total_deposits: number;
  total_net_deposits: number;
}

export interface MetricasCalculadas {
  investimento: number | null;
  registros: number | null;
  custoRegistro: number | null;
  ftd: number | null;
  cliques: number | null;
  cpc: number | null;
  entradas: number | null;
  custoLead: number | null;
  pctCliqueEntrada: number | null;
  pctRegFtd: number | null;
  pctEntradaFtd: number | null;
  deposito: number | null;
  ngr: number | null;
  pctDepositoNgr: number | null;
  ticketMedio: number | null;
}

export type Sinal = "up" | "down" | "neutral";

export interface Variacao {
  pct: number | null;
  sinal: Sinal;
}

function safeDiv(a: number, b: number): number | null {
  if (!b || isNaN(b)) return null;
  const r = a / b;
  if (!isFinite(r) || isNaN(r)) return null;
  return r;
}

function safePct(a: number, b: number): number | null {
  const r = safeDiv(a, b);
  return r === null ? null : r * 100;
}

export function calcMetricas(inputs: MetricasInputs): MetricasCalculadas {
  const {
    investimento,
    cliques,
    entradas_grupo,
    total_registros,
    total_ftd,
    total_deposits,
    total_net_deposits,
  } = inputs;

  return {
    investimento,
    cliques,
    entradas: entradas_grupo,
    registros: total_registros,
    ftd: total_ftd,
    deposito: total_deposits,
    ngr: total_net_deposits,
    custoRegistro: safeDiv(investimento, total_registros),
    cpc: safeDiv(investimento, cliques),
    custoLead: safeDiv(investimento, entradas_grupo),
    ticketMedio: safeDiv(total_deposits, total_ftd),
    pctCliqueEntrada: safePct(entradas_grupo, cliques),
    pctRegFtd: safePct(total_ftd, total_registros),
    pctEntradaFtd: safePct(total_ftd, entradas_grupo),
    pctDepositoNgr: safePct(total_net_deposits, total_deposits),
  };
}

export function calcVariacao(
  atual: number | null,
  anterior: number | null,
): Variacao {
  if (anterior === null || anterior === 0 || atual === null) {
    return { pct: null, sinal: "neutral" };
  }
  const pct = ((atual - anterior) / anterior) * 100;
  if (pct > 0) return { pct, sinal: "up" };
  if (pct < 0) return { pct, sinal: "down" };
  return { pct: 0, sinal: "neutral" };
}

export const ZERO_INPUTS: MetricasInputs = {
  investimento: 0,
  cliques: 0,
  entradas_grupo: 0,
  total_registros: 0,
  total_ftd: 0,
  total_deposits: 0,
  total_net_deposits: 0,
};
