import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]+$/;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const incluirInativos = searchParams.get("incluir_inativos") === "true";

  let query = supabase
    .from("experts")
    .select("id, slug, nome, ativo, ordem")
    .order("ordem", { ascending: true });

  if (!incluirInativos) {
    query = query.eq("ativo", true);
  }

  const { data: experts, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: campanhas } = await supabase
    .from("campanhas")
    .select("expert_id");

  const countMap = new Map<string, number>();
  for (const c of campanhas ?? []) {
    if (!c.expert_id) continue;
    countMap.set(c.expert_id, (countMap.get(c.expert_id) ?? 0) + 1);
  }

  const result = (experts ?? []).map((e) => ({
    ...e,
    campanhas_count: countMap.get(e.id) ?? 0,
  }));

  return NextResponse.json({ data: result });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { nome?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!nome) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "Slug inválido (use só letras minúsculas, números e hífens)" },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("experts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "Slug já existe" },
      { status: 409 },
    );
  }

  const { data: maxRow } = await supabase
    .from("experts")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (maxRow?.ordem ?? 0) + 1;

  const { data, error } = await supabase
    .from("experts")
    .insert({ nome, slug, ordem: nextOrdem, ativo: true })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expert: data });
}
