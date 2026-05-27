import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MARCAS = new Set(["BINGO", "REALS"]);

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const expertId = searchParams.get("expert_id");

  let query = supabase
    .from("campanhas")
    .select(
      "id, nome, marca, codigo_ux, affiliate_id, expert_id, experts:expert_id ( id, slug, nome )",
    )
    .order("nome", { ascending: true });

  if (expertId) {
    query = query.eq("expert_id", expertId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    nome?: unknown;
    marca?: unknown;
    expert_id?: unknown;
    codigo_ux?: unknown;
    affiliate_id?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const marca = typeof body.marca === "string" ? body.marca.trim() : "";
  const expert_id =
    typeof body.expert_id === "string" ? body.expert_id.trim() : "";
  const codigo_ux =
    typeof body.codigo_ux === "string" && body.codigo_ux.trim()
      ? body.codigo_ux.trim()
      : null;
  const affiliate_id =
    typeof body.affiliate_id === "string" && body.affiliate_id.trim()
      ? body.affiliate_id.trim()
      : null;

  if (!nome) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }
  if (!MARCAS.has(marca)) {
    return NextResponse.json(
      { error: "Marca inválida (use BINGO ou REALS)" },
      { status: 400 },
    );
  }
  if (!expert_id) {
    return NextResponse.json(
      { error: "Expert obrigatório" },
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
    .from("campanhas")
    .insert({ nome, marca, expert_id, codigo_ux, affiliate_id })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campanha: data });
}
