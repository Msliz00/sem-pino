import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { nome: string; drive_url: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    criativos?: unknown;
    expert_id?: unknown;
    data_criacao?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const expertId =
    typeof body.expert_id === "string" ? body.expert_id.trim() : "";
  const dataCriacao =
    typeof body.data_criacao === "string" ? body.data_criacao.trim() : "";

  if (!expertId) {
    return NextResponse.json(
      { error: "Expert obrigatório" },
      { status: 400 },
    );
  }
  if (!dataCriacao) {
    return NextResponse.json({ error: "Data obrigatória" }, { status: 400 });
  }

  if (!Array.isArray(body.criativos) || body.criativos.length === 0) {
    return NextResponse.json(
      { error: "Nenhum criativo enviado" },
      { status: 400 },
    );
  }

  const items: Item[] = body.criativos
    .filter(
      (c): c is { nome: string; drive_url: string } =>
        !!c &&
        typeof (c as Record<string, unknown>).nome === "string" &&
        typeof (c as Record<string, unknown>).drive_url === "string",
    )
    .map((c) => ({ nome: c.nome.trim(), drive_url: c.drive_url.trim() }))
    .filter((c) => c.nome.length > 0);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Nenhum criativo válido" },
      { status: 400 },
    );
  }

  const { data: expert } = await supabase
    .from("experts")
    .select("id")
    .eq("id", expertId)
    .maybeSingle();
  if (!expert) {
    return NextResponse.json(
      { error: "Expert não encontrado" },
      { status: 400 },
    );
  }

  const rows = items.map((c) => ({
    nome: c.nome,
    drive_url: c.drive_url || null,
    expert_id: expertId,
    data_criacao: dataCriacao,
    status: "PENDENTE" as const,
  }));

  const { data, error } = await supabase
    .from("criativos")
    .insert(rows)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: data?.length ?? 0 });
}
