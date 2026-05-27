import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MarcaDominante = "BINGO" | "REALS" | "MISTA" | null;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const expertSlug = searchParams.get("expert") || "todos";
  const marca = (searchParams.get("marca") || "todas").toUpperCase();
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("per_page") || "20", 10) || 20),
  );

  // marca map: expert_id -> Set<marca>
  const { data: campanhasRows } = await supabase
    .from("campanhas")
    .select("expert_id, marca");

  const expertMarcas = new Map<string, Set<string>>();
  for (const c of campanhasRows ?? []) {
    if (!c.expert_id) continue;
    const set = expertMarcas.get(c.expert_id) ?? new Set<string>();
    set.add(c.marca);
    expertMarcas.set(c.expert_id, set);
  }

  function getMarcaDominante(expertId: string): MarcaDominante {
    const marcas = expertMarcas.get(expertId);
    if (!marcas || marcas.size === 0) return null;
    if (marcas.size === 1) {
      const m = [...marcas][0];
      return m === "BINGO" || m === "REALS" ? m : null;
    }
    return "MISTA";
  }

  let query = supabase
    .from("uploads_diarios")
    .select(
      `id, data_referencia, investimento, cliques, entradas_grupo,
       total_registros, total_ftd, total_deposits, total_withdrawn,
       total_net_deposits, total_wagering, distribuicao_origens,
       arquivo_nome, uploaded_at,
       experts:expert_id ( id, slug, nome )`,
      { count: "exact" },
    );

  if (expertSlug !== "todos") {
    const { data: exp } = await supabase
      .from("experts")
      .select("id")
      .eq("slug", expertSlug)
      .maybeSingle();
    if (!exp) {
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        per_page: perPage,
      });
    }
    query = query.eq("expert_id", exp.id);
  }

  if (marca === "BINGO" || marca === "REALS") {
    const { data: allExperts } = await supabase.from("experts").select("id");
    const includedIds = (allExperts ?? [])
      .map((e) => e.id)
      .filter((id) => {
        const set = expertMarcas.get(id);
        if (!set || set.size === 0) return false;
        if (set.size > 1) return true; // mistos passam
        return set.has(marca);
      });
    if (includedIds.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        per_page: perPage,
      });
    }
    query = query.in("expert_id", includedIds);
  }

  if (dataInicio) query = query.gte("data_referencia", dataInicio);
  if (dataFim) query = query.lte("data_referencia", dataFim);

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.order("data_referencia", { ascending: false }).range(from, to);

  const { data: rows, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const data = (rows ?? []).map((r) => {
    const exp = r.experts as unknown as
      | { id: string; slug: string; nome: string }
      | null;
    return {
      id: r.id,
      data_referencia: r.data_referencia,
      investimento: Number(r.investimento ?? 0),
      cliques: Number(r.cliques ?? 0),
      entradas_grupo: Number(r.entradas_grupo ?? 0),
      total_registros: Number(r.total_registros ?? 0),
      total_ftd: Number(r.total_ftd ?? 0),
      total_deposits: Number(r.total_deposits ?? 0),
      total_withdrawn: Number(r.total_withdrawn ?? 0),
      total_net_deposits: Number(r.total_net_deposits ?? 0),
      total_wagering: Number(r.total_wagering ?? 0),
      distribuicao_origens: r.distribuicao_origens ?? {},
      arquivo_nome: r.arquivo_nome,
      uploaded_at: r.uploaded_at,
      expert: exp
        ? {
            id: exp.id,
            slug: exp.slug,
            nome: exp.nome,
            marca_dominante: getMarcaDominante(exp.id),
          }
        : null,
    };
  });

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}
