import { createClient } from "@/lib/supabase/server";
import type { MetricasInputs } from "@/lib/metricas";

export type ExpertSlug = "todos" | "professor" | "iris-aviator" | string;

export interface Referencias {
  hoje: string | null;
  ontem: string | null;
}

// Métricas manuais que continuam vindo do upload XLSX.
type UploadInputs = Pick<
  MetricasInputs,
  "investimento" | "cliques" | "entradas_grupo"
>;

// REG/FTD/DEP/NGR consolidados da gSheet (fonte da verdade).
type BtagInputs = Pick<
  MetricasInputs,
  "total_registros" | "total_ftd" | "total_deposits" | "total_net_deposits"
>;

// Retorna a maior data (ISO YYYY-MM-DD comparável lexicograficamente).
function maxStr(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

type DateTable = "uploads_diarios" | "metricas_diarias_btag";

// Última data de uma tabela (opcionalmente anterior a `before` e/ou filtrada
// por expert). Ambas as tabelas têm a coluna expert_id.
async function latestDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: DateTable,
  before: string | null,
  expertId: string | null,
): Promise<string | null> {
  const col = table === "uploads_diarios" ? "data_referencia" : "data";
  let q = supabase
    .from(table)
    .select(`ref:${col}`)
    .order(col, { ascending: false })
    .limit(1);
  if (before) q = q.lt(col, before);
  if (expertId) q = q.eq("expert_id", expertId);
  const { data } = await q;
  return (data?.[0] as { ref?: string } | undefined)?.ref ?? null;
}

// hoje/ontem = maior data disponível em QUALQUER das duas fontes, respeitando
// o filtro de expert. Assim um expert que só tem gSheet (sem upload) ainda
// rende data de referência — e vice-versa.
export async function getReferencias(
  expertSlug: ExpertSlug = "todos",
): Promise<Referencias> {
  const supabase = await createClient();

  const expert = await resolveExpertId(supabase, expertSlug);
  if (!expert.ok) return { hoje: null, ontem: null };
  const expertId = expert.expertId;

  const hoje = maxStr(
    await latestDate(supabase, "uploads_diarios", null, expertId),
    await latestDate(supabase, "metricas_diarias_btag", null, expertId),
  );
  if (!hoje) return { hoje: null, ontem: null };

  const ontem = maxStr(
    await latestDate(supabase, "uploads_diarios", hoje, expertId),
    await latestDate(supabase, "metricas_diarias_btag", hoje, expertId),
  );
  return { hoje, ontem };
}

// Resolve expert_id a partir do slug; null = "todos" (sem filtro).
// Retorna { ok:false } se o slug não existir.
async function resolveExpertId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  expertSlug: ExpertSlug,
): Promise<{ ok: true; expertId: string | null } | { ok: false }> {
  if (expertSlug === "todos") return { ok: true, expertId: null };
  const { data: exp } = await supabase
    .from("experts")
    .select("id")
    .eq("slug", expertSlug)
    .maybeSingle();
  if (!exp) return { ok: false };
  return { ok: true, expertId: exp.id };
}

// Métricas manuais (Investimento/Cliques/Entradas) somadas, de uploads_diarios.
export async function getUploadsForDate(
  expertSlug: ExpertSlug,
  date: string | null,
): Promise<UploadInputs | null> {
  if (!date) return null;
  const supabase = await createClient();

  const expert = await resolveExpertId(supabase, expertSlug);
  if (!expert.ok) return null;

  let query = supabase
    .from("uploads_diarios")
    .select("investimento, cliques, entradas_grupo")
    .eq("data_referencia", date);
  if (expert.expertId) query = query.eq("expert_id", expert.expertId);

  const { data: rows, error } = await query;
  if (error || !rows || rows.length === 0) return null;

  return rows.reduce<UploadInputs>(
    (acc, r) => ({
      investimento: acc.investimento + Number(r.investimento ?? 0),
      cliques: acc.cliques + Number(r.cliques ?? 0),
      entradas_grupo: acc.entradas_grupo + Number(r.entradas_grupo ?? 0),
    }),
    { investimento: 0, cliques: 0, entradas_grupo: 0 },
  );
}

// REG/FTD/DEP/NGR somados por expert (soma dos BTAGs), de metricas_diarias_btag.
// A tabela já guarda expert_id denormalizado, então filtra direto por ele.
export async function getMetricasBtagForDate(
  expertSlug: ExpertSlug,
  date: string | null,
): Promise<BtagInputs | null> {
  if (!date) return null;
  const supabase = await createClient();

  const expert = await resolveExpertId(supabase, expertSlug);
  if (!expert.ok) return null;

  let query = supabase
    .from("metricas_diarias_btag")
    .select("registros, ftd, depositos, ngr")
    .eq("data", date);
  if (expert.expertId) query = query.eq("expert_id", expert.expertId);

  const { data: rows, error } = await query;
  if (error || !rows || rows.length === 0) return null;

  return rows.reduce<BtagInputs>(
    (acc, r) => ({
      total_registros: acc.total_registros + Number(r.registros ?? 0),
      total_ftd: acc.total_ftd + Number(r.ftd ?? 0),
      total_deposits: acc.total_deposits + Number(r.depositos ?? 0),
      total_net_deposits: acc.total_net_deposits + Number(r.ngr ?? 0),
    }),
    {
      total_registros: 0,
      total_ftd: 0,
      total_deposits: 0,
      total_net_deposits: 0,
    },
  );
}

// Combina as duas fontes no shape que calcMetricas() já espera.
// Lado ausente vira zero; retorna null só se NENHUMA fonte tem dado no dia.
export async function getMetricasForDate(
  expertSlug: ExpertSlug,
  date: string | null,
): Promise<MetricasInputs | null> {
  if (!date) return null;

  const [uploads, btag] = await Promise.all([
    getUploadsForDate(expertSlug, date),
    getMetricasBtagForDate(expertSlug, date),
  ]);

  if (!uploads && !btag) return null;

  return {
    investimento: uploads?.investimento ?? 0,
    cliques: uploads?.cliques ?? 0,
    entradas_grupo: uploads?.entradas_grupo ?? 0,
    total_registros: btag?.total_registros ?? 0,
    total_ftd: btag?.total_ftd ?? 0,
    total_deposits: btag?.total_deposits ?? 0,
    total_net_deposits: btag?.total_net_deposits ?? 0,
  };
}
