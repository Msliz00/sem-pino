import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as {
    investimento?: unknown;
    cliques?: unknown;
    entradas_grupo?: unknown;
  };

  const investimento = Number(b.investimento);
  const cliques = Number(b.cliques);
  const entradas_grupo = Number(b.entradas_grupo);

  const values = [investimento, cliques, entradas_grupo];
  if (values.some((v) => Number.isNaN(v) || v < 0)) {
    return NextResponse.json(
      { error: "Valores inválidos. Não podem ser negativos." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("uploads_diarios")
    .update({ investimento, cliques, entradas_grupo })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Upload não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, upload: data });
}
