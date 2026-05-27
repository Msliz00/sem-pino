import { createClient } from "@/lib/supabase/server";
import type { MetricasInputs } from "@/lib/metricas";
import { ZERO_INPUTS } from "@/lib/metricas";

export type ExpertSlug = "todos" | "professor" | "iris-aviator" | string;

export interface Referencias {
  hoje: string | null;
  ontem: string | null;
}

export async function getReferencias(): Promise<Referencias> {
  const supabase = await createClient();

  const { data: hojeRows } = await supabase
    .from("uploads_diarios")
    .select("data_referencia")
    .order("data_referencia", { ascending: false })
    .limit(1);

  const hoje = hojeRows?.[0]?.data_referencia ?? null;
  if (!hoje) return { hoje: null, ontem: null };

  const { data: ontemRows } = await supabase
    .from("uploads_diarios")
    .select("data_referencia")
    .lt("data_referencia", hoje)
    .order("data_referencia", { ascending: false })
    .limit(1);

  const ontem = ontemRows?.[0]?.data_referencia ?? null;
  return { hoje, ontem };
}

export async function getUploadsForDate(
  expertSlug: ExpertSlug,
  date: string | null,
): Promise<MetricasInputs | null> {
  if (!date) return null;
  const supabase = await createClient();

  let expertId: string | null = null;
  if (expertSlug !== "todos") {
    const { data: exp } = await supabase
      .from("experts")
      .select("id")
      .eq("slug", expertSlug)
      .maybeSingle();
    if (!exp) return null;
    expertId = exp.id;
  }

  let query = supabase
    .from("uploads_diarios")
    .select(
      "investimento, cliques, entradas_grupo, total_registros, total_ftd, total_deposits, total_net_deposits",
    )
    .eq("data_referencia", date);

  if (expertId) {
    query = query.eq("expert_id", expertId);
  }

  const { data: rows, error } = await query;
  if (error || !rows || rows.length === 0) return null;

  return rows.reduce<MetricasInputs>(
    (acc, r) => ({
      investimento: acc.investimento + Number(r.investimento ?? 0),
      cliques: acc.cliques + Number(r.cliques ?? 0),
      entradas_grupo: acc.entradas_grupo + Number(r.entradas_grupo ?? 0),
      total_registros: acc.total_registros + Number(r.total_registros ?? 0),
      total_ftd: acc.total_ftd + Number(r.total_ftd ?? 0),
      total_deposits: acc.total_deposits + Number(r.total_deposits ?? 0),
      total_net_deposits:
        acc.total_net_deposits + Number(r.total_net_deposits ?? 0),
    }),
    { ...ZERO_INPUTS },
  );
}
