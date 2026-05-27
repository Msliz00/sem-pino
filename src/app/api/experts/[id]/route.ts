import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]+$/;

export async function GET(
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

  const { data, error } = await supabase
    .from("experts")
    .select("id, slug, nome, ativo, ordem")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Expert não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

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

  let body: { nome?: unknown; slug?: unknown; ativo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("experts")
    .select("id, slug, nome, ativo")
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    return NextResponse.json(
      { error: "Expert não encontrado" },
      { status: 404 },
    );
  }

  const updates: { nome?: string; slug?: string; ativo?: boolean } = {};

  if (body.nome !== undefined) {
    if (typeof body.nome !== "string" || !body.nome.trim()) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }
    updates.nome = body.nome.trim();
  }

  if (body.slug !== undefined) {
    const newSlug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!SLUG_RE.test(newSlug)) {
      return NextResponse.json(
        { error: "Slug inválido (use só letras minúsculas, números e hífens)" },
        { status: 400 },
      );
    }
    if (newSlug !== current.slug) {
      const { data: dup } = await supabase
        .from("experts")
        .select("id")
        .eq("slug", newSlug)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { error: "Slug já existe" },
          { status: 409 },
        );
      }
      updates.slug = newSlug;
    }
  }

  if (body.ativo !== undefined) {
    if (typeof body.ativo !== "boolean") {
      return NextResponse.json(
        { error: "Valor de ativo inválido" },
        { status: 400 },
      );
    }
    if (body.ativo === false && current.ativo === true) {
      const { count } = await supabase
        .from("uploads_diarios")
        .select("id", { count: "exact", head: true })
        .eq("expert_id", id);
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          {
            error: `Expert tem ${count} upload${count === 1 ? "" : "s"}. Não pode ser desativado.`,
          },
          { status: 409 },
        );
      }
    }
    updates.ativo = body.ativo;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, expert: current });
  }

  const { data, error } = await supabase
    .from("experts")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expert: data });
}
