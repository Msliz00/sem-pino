import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseRegistrations,
  type ParsedData,
} from "@/lib/parsers/parseRegistrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Limite de tempo de processamento. Vercel default 4.5MB pro body —
// 5 planilhas XLSX ~500KB cada cabem com folga (~2.5MB total).
// Não há config de body size no App Router; a Vercel impõe pela plataforma.
export const maxDuration = 60;

type FileSummary = {
  arquivo: string;
  btag: string | null;
  registros: number;
  ftd: number;
  data_referencia: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawFiles = formData.getAll("file");
  const files: File[] = rawFiles.filter(
    (f): f is File => f instanceof File && f.size > 0,
  );
  const expertSlug = formData.get("expert_slug");
  const investimento = parseFloat(String(formData.get("investimento") ?? "0")) || 0;
  const cliques = parseInt(String(formData.get("cliques") ?? "0"), 10) || 0;
  const entradas = parseInt(String(formData.get("entradas") ?? "0"), 10) || 0;
  const overwrite = formData.get("overwrite") === "true";

  if (files.length === 0 || typeof expertSlug !== "string" || !expertSlug) {
    return NextResponse.json(
      { error: "Selecione ao menos 1 arquivo e o expert." },
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

  // Carrega BTAGs do expert (união de codigo_ux + affiliate_id)
  const { data: campanhas } = await supabase
    .from("campanhas")
    .select("codigo_ux, affiliate_id")
    .eq("expert_id", expert.id);

  const btagSet = new Set<string>();
  for (const c of campanhas ?? []) {
    if (c.codigo_ux) btagSet.add(String(c.codigo_ux).trim());
    if (c.affiliate_id) btagSet.add(String(c.affiliate_id).trim());
  }

  if (btagSet.size === 0) {
    return NextResponse.json(
      {
        error: `Expert ${expert.nome} não tem nenhum BTAG cadastrado em /gestao. Cadastre as campanhas antes de subir planilhas.`,
      },
      { status: 400 },
    );
  }

  // Lê + parseia cada arquivo
  const parsedList: { file: File; buffer: ArrayBuffer; parsed: ParsedData }[] =
    [];
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    try {
      const parsed = parseRegistrations(buffer);
      parsedList.push({ file, buffer, parsed });
    } catch (e) {
      return NextResponse.json(
        {
          error: `Erro ao processar "${file.name}": ${e instanceof Error ? e.message : "falha no parser"}`,
        },
        { status: 400 },
      );
    }
  }

  // Valida data_referencia consistente entre arquivos
  const dataSet = new Set(parsedList.map((p) => p.parsed.data_referencia));
  if (dataSet.size > 1) {
    const detalhes = parsedList
      .map((p) => `${p.file.name} → ${p.parsed.data_referencia}`)
      .join(" · ");
    return NextResponse.json(
      {
        error: `Datas divergentes entre planilhas. Não consolidado. Detalhes: ${detalhes}`,
      },
      { status: 400 },
    );
  }
  const data_referencia = parsedList[0].parsed.data_referencia;

  // Valida TODOS os BTAGs distintos de cada arquivo (não só o dominante)
  const btagsInvalidos: string[] = [];
  for (const { file, parsed } of parsedList) {
    if (parsed.btags_distintos.length === 0) {
      btagsInvalidos.push(`"${file.name}" sem AffiliateId detectado`);
      continue;
    }
    const invalidos = parsed.btags_distintos
      .map((b) => b.btag.trim())
      .filter((b) => !btagSet.has(b));
    if (invalidos.length > 0) {
      btagsInvalidos.push(
        `"${file.name}" contém BTAG(s) não cadastrado(s) em ${expert.nome}: ${invalidos.join(", ")}`,
      );
    }
  }
  if (btagsInvalidos.length > 0) {
    return NextResponse.json(
      {
        error: `Validação de BTAG falhou: ${btagsInvalidos.join(" · ")}`,
      },
      { status: 400 },
    );
  }

  // Verifica duplicata
  const { data: existing } = await supabase
    .from("uploads_diarios")
    .select("id, arquivo_nome")
    .eq("expert_id", expert.id)
    .eq("data_referencia", data_referencia)
    .maybeSingle();

  if (existing && !overwrite) {
    return NextResponse.json(
      {
        error: "duplicate",
        expert_nome: expert.nome,
        data_referencia,
      },
      { status: 409 },
    );
  }

  // Upload de cada arquivo pro storage com BTAG no path
  const storagePaths: string[] = [];
  for (const { file, buffer, parsed } of parsedList) {
    const btag = parsed.affiliate_id_detectado ?? "unknown";
    const safeBtag = btag.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${expertSlug}/${data_referencia}/${safeBtag}_${Date.now()}_${safeName}`;
    const { error: storageErr } = await supabase.storage
      .from("uploads-planilhas")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (storageErr) {
      return NextResponse.json(
        { error: `Storage (${file.name}): ${storageErr.message}` },
        { status: 500 },
      );
    }
    storagePaths.push(storagePath);
  }

  // Agrega totais
  const totals = parsedList.reduce(
    (acc, { parsed }) => ({
      total_registros: acc.total_registros + parsed.total_registros,
      total_ftd: acc.total_ftd + parsed.total_ftd,
      total_deposits: acc.total_deposits + parsed.total_deposits,
      total_withdrawn: acc.total_withdrawn + parsed.total_withdrawn,
      total_net_deposits: acc.total_net_deposits + parsed.total_net_deposits,
      total_wagering: acc.total_wagering + parsed.total_wagering,
    }),
    {
      total_registros: 0,
      total_ftd: 0,
      total_deposits: 0,
      total_withdrawn: 0,
      total_net_deposits: 0,
      total_wagering: 0,
    },
  );

  // Agrega distribuicao_origens
  const distribuicao_origens: Record<
    string,
    { registros: number; ftd: number }
  > = {};
  for (const { parsed } of parsedList) {
    for (const [origem, v] of Object.entries(parsed.distribuicao_origens)) {
      const cur = distribuicao_origens[origem] ?? { registros: 0, ftd: 0 };
      cur.registros += v.registros;
      cur.ftd += v.ftd;
      distribuicao_origens[origem] = cur;
    }
  }

  const breakdown: FileSummary[] = parsedList.map(({ file, parsed }) => ({
    arquivo: file.name,
    btag: parsed.affiliate_id_detectado,
    registros: parsed.total_registros,
    ftd: parsed.total_ftd,
    data_referencia: parsed.data_referencia,
  }));

  const row = {
    expert_id: expert.id,
    data_referencia,
    investimento,
    cliques,
    entradas_grupo: entradas,
    ...totals,
    distribuicao_origens,
    arquivo_nome: JSON.stringify(storagePaths),
    uploaded_by: user.id,
  };

  // Conflict: DELETE existing then INSERT
  if (existing) {
    const { error: delErr } = await supabase
      .from("uploads_diarios")
      .delete()
      .eq("id", existing.id);
    if (delErr) {
      return NextResponse.json(
        { error: `Falha ao remover registro anterior: ${delErr.message}` },
        { status: 500 },
      );
    }
  }

  const { error: insErr } = await supabase
    .from("uploads_diarios")
    .insert(row);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total_registros: totals.total_registros,
      total_ftd: totals.total_ftd,
      data_referencia,
      arquivos: files.length,
    },
    breakdown,
  });
}
