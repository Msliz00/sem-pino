import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MARCAS = new Set(["BINGO", "REALS"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const updates: {
    nome?: string;
    marca?: string;
    expert_id?: string;
    codigo_ux?: string | null;
    affiliate_id?: string | null;
  } = {};

  if (body.nome !== undefined) {
    if (typeof body.nome !== "string" || !body.nome.trim()) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }
    updates.nome = body.nome.trim();
  }

  if (body.marca !== undefined) {
    if (typeof body.marca !== "string" || !MARCAS.has(body.marca)) {
      return NextResponse.json(
        { error: "Marca inválida (use BINGO ou REALS)" },
        { status: 400 },
      );
    }
    updates.marca = body.marca;
  }

  if (body.expert_id !== undefined) {
    if (typeof body.expert_id !== "string" || !body.expert_id) {
      return NextResponse.json(
        { error: "Expert inválido" },
        { status: 400 },
      );
    }
    const { data: exp } = await supabase
      .from("experts")
      .select("id")
      .eq("id", body.expert_id)
      .maybeSingle();
    if (!exp) {
      return NextResponse.json(
        { error: "Expert não encontrado" },
        { status: 400 },
      );
    }
    updates.expert_id = body.expert_id;
  }

  if (body.codigo_ux !== undefined) {
    updates.codigo_ux =
      typeof body.codigo_ux === "string" && body.codigo_ux.trim()
        ? body.codigo_ux.trim()
        : null;
  }

  if (body.affiliate_id !== undefined) {
    updates.affiliate_id =
      typeof body.affiliate_id === "string" && body.affiliate_id.trim()
        ? body.affiliate_id.trim()
        : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo pra atualizar" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("campanhas")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Campanha não encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, campanha: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("campanhas").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
