import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  STATUSES,
  isDriveUrl,
  isValidMetaAdId,
  isValidUrl,
} from "@/lib/criativos-validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MarcaDominante = "BINGO" | "REALS" | "MISTA" | null;

async function buildMarcaMap(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: campanhasRows } = await supabase
    .from("campanhas")
    .select("expert_id, marca");
  const map = new Map<string, Set<string>>();
  for (const c of campanhasRows ?? []) {
    if (!c.expert_id) continue;
    const set = map.get(c.expert_id) ?? new Set<string>();
    set.add(c.marca);
    map.set(c.expert_id, set);
  }
  return map;
}

function marcaDominanteFor(
  expertId: string,
  map: Map<string, Set<string>>,
): MarcaDominante {
  const set = map.get(expertId);
  if (!set || set.size === 0) return null;
  if (set.size === 1) {
    const m = [...set][0];
    return m === "BINGO" || m === "REALS" ? m : null;
  }
  return "MISTA";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const expertSlug = searchParams.get("expert");
  const expertId = searchParams.get("expert_id");
  const status = searchParams.get("status");
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");

  let query = supabase
    .from("criativos")
    .select(
      `*, experts:expert_id ( id, slug, nome )`,
    )
    .order("data_criacao", { ascending: false });

  if (expertId) {
    query = query.eq("expert_id", expertId);
  } else if (expertSlug && expertSlug !== "todos") {
    const { data: exp } = await supabase
      .from("experts")
      .select("id")
      .eq("slug", expertSlug)
      .maybeSingle();
    if (!exp) {
      return NextResponse.json({ data: [] });
    }
    query = query.eq("expert_id", exp.id);
  }

  if (status && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }

  if (dataInicio) query = query.gte("data_criacao", dataInicio);
  if (dataFim) query = query.lte("data_criacao", dataFim);

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const marcaMap = await buildMarcaMap(supabase);

  const data = (rows ?? []).map((r) => {
    const exp = r.experts as unknown as
      | { id: string; slug: string; nome: string }
      | null;
    return {
      ...r,
      experts: undefined,
      expert: exp
        ? {
            id: exp.id,
            slug: exp.slug,
            nome: exp.nome,
            marca_dominante: marcaDominanteFor(exp.id, marcaMap),
          }
        : null,
    };
  });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const data_criacao =
    typeof body.data_criacao === "string" ? body.data_criacao.trim() : "";
  const expert_id =
    typeof body.expert_id === "string" ? body.expert_id.trim() : "";
  const status =
    typeof body.status === "string" ? body.status.trim() : "PENDENTE";
  const drive_url =
    typeof body.drive_url === "string" && body.drive_url.trim()
      ? body.drive_url.trim()
      : null;
  const meta_ad_id =
    typeof body.meta_ad_id === "string" && body.meta_ad_id.trim()
      ? body.meta_ad_id.trim()
      : null;
  const destination_url =
    typeof body.destination_url === "string" && body.destination_url.trim()
      ? body.destination_url.trim()
      : null;

  if (!nome) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }
  if (!data_criacao) {
    return NextResponse.json({ error: "Data obrigatória" }, { status: 400 });
  }
  if (!expert_id) {
    return NextResponse.json(
      { error: "Expert obrigatório" },
      { status: 400 },
    );
  }
  if (!(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }
  if (drive_url && !isDriveUrl(drive_url)) {
    return NextResponse.json(
      {
        error:
          "Drive URL deve começar com https://drive.google.com ou https://docs.google.com",
      },
      { status: 400 },
    );
  }
  if (meta_ad_id && !isValidMetaAdId(meta_ad_id)) {
    return NextResponse.json(
      { error: "Meta Ad ID inválido (10-20 dígitos)" },
      { status: 400 },
    );
  }
  if (destination_url && !isValidUrl(destination_url)) {
    return NextResponse.json(
      { error: "Destination URL inválida" },
      { status: 400 },
    );
  }

  const { data: exp } = await supabase
    .from("experts")
    .select("id")
    .eq("id", expert_id)
    .maybeSingle();
  if (!exp) {
    return NextResponse.json(
      { error: "Expert não encontrado" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("criativos")
    .insert({
      nome,
      data_criacao,
      expert_id,
      status,
      drive_url,
      meta_ad_id,
      destination_url,
    })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, criativo: data });
}
