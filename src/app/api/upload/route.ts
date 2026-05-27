import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRegistrations } from "@/lib/parsers/parseRegistrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const expertSlug = formData.get("expert_slug");
  const investimento = parseFloat(String(formData.get("investimento") ?? "0")) || 0;
  const cliques = parseInt(String(formData.get("cliques") ?? "0"), 10) || 0;
  const entradas = parseInt(String(formData.get("entradas") ?? "0"), 10) || 0;
  const overwrite = formData.get("overwrite") === "true";

  if (!(file instanceof File) || typeof expertSlug !== "string" || !expertSlug) {
    return NextResponse.json(
      { error: "Arquivo ou expert ausentes." },
      { status: 400 },
    );
  }

  const { data: expert, error: expertErr } = await supabase
    .from("experts")
    .select("id, nome")
    .eq("slug", expertSlug)
    .maybeSingle();

  if (expertErr || !expert) {
    return NextResponse.json({ error: "Expert inválido." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();

  let parsed;
  try {
    parsed = parseRegistrations(buffer);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao processar planilha." },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("uploads_diarios")
    .select("id")
    .eq("expert_id", expert.id)
    .eq("data_referencia", parsed.data_referencia)
    .maybeSingle();

  if (existing && !overwrite) {
    return NextResponse.json(
      {
        error: "duplicate",
        expert_nome: expert.nome,
        data_referencia: parsed.data_referencia,
      },
      { status: 409 },
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${expertSlug}/${parsed.data_referencia}/${Date.now()}_${safeName}`;
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

  const row = {
    expert_id: expert.id,
    data_referencia: parsed.data_referencia,
    investimento,
    cliques,
    entradas_grupo: entradas,
    total_registros: parsed.total_registros,
    total_ftd: parsed.total_ftd,
    total_deposits: parsed.total_deposits,
    total_withdrawn: parsed.total_withdrawn,
    total_net_deposits: parsed.total_net_deposits,
    total_wagering: parsed.total_wagering,
    distribuicao_origens: parsed.distribuicao_origens,
    arquivo_nome: storagePath,
    uploaded_by: user.id,
  };

  if (existing) {
    const { error: updErr } = await supabase
      .from("uploads_diarios")
      .update(row)
      .eq("id", existing.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await supabase
      .from("uploads_diarios")
      .insert(row);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total_registros: parsed.total_registros,
      total_ftd: parsed.total_ftd,
      data_referencia: parsed.data_referencia,
    },
  });
}
