import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRegistrations } from "@/lib/parsers/parseRegistrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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

  const { data: existing } = await supabase
    .from("uploads_diarios")
    .select(
      "id, expert_id, data_referencia, experts:expert_id ( slug )",
    )
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Upload não encontrado" },
      { status: 404 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Arquivo ausente" },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = parseRegistrations(buffer, { strict: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao processar planilha" },
      { status: 400 },
    );
  }

  const exp = existing.experts as unknown as { slug?: string } | null;
  const expertSlug = exp?.slug ?? "expert";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${expertSlug}/${existing.data_referencia}/${Date.now()}_${safeName}`;

  const { error: storageErr } = await supabase.storage
    .from("uploads-planilhas")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (storageErr) {
    return NextResponse.json(
      { error: `Storage: ${storageErr.message}` },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("uploads_diarios")
    .update({
      total_registros: parsed.total_registros,
      total_ftd: parsed.total_ftd,
      total_deposits: parsed.total_deposits,
      total_withdrawn: parsed.total_withdrawn,
      total_net_deposits: parsed.total_net_deposits,
      total_wagering: parsed.total_wagering,
      distribuicao_origens: parsed.distribuicao_origens,
      arquivo_nome: storagePath,
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upload: data });
}
