import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { readIrisGSheet, IRIS_BLOCKS } from "@/lib/gsheet-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPERT_SLUG = "iris-aviator";

// Libera se: (1) Bearer token bater exatamente com SYNC_WEBHOOK_TOKEN, ou
// (2) houver sessão Supabase autenticada. Sem token na env, o caminho do
// bearer nunca valida. O admin client NÃO é usado aqui — só pra escrita.
async function isAuthorized(request: Request): Promise<boolean> {
  const expected = process.env.SYNC_WEBHOOK_TOKEN;
  if (expected) {
    const authHeader = request.headers.get("authorization") ?? "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (match && match[1] === expected) return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Escrita de backend: usa service role key (bypassa RLS), sem sessão.
  // Já pronto pro webhook futuro sem cookies. Token de auth vem numa etapa adiante.
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 500 },
    );
  }

  let rows;
  try {
    rows = await readIrisGSheet();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "missing-env" || msg === "invalid-sa-json") {
      return NextResponse.json(
        { error: "Service Account não configurada corretamente" },
        { status: 500 },
      );
    }
    if (msg === "missing-gsheet-id") {
      return NextResponse.json(
        { error: "GSHEET_IRIS_ID não configurada" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? `Sheets API: ${e.message}` : "Erro ao ler gSheet" },
      { status: 500 },
    );
  }

  const errors: string[] = [];

  // Lookup do expert.
  const { data: expert } = await supabase
    .from("experts")
    .select("id")
    .eq("slug", EXPERT_SLUG)
    .maybeSingle();
  if (!expert) {
    return NextResponse.json(
      { error: `Expert '${EXPERT_SLUG}' não encontrado` },
      { status: 400 },
    );
  }

  // Mapa BTAG -> campanha_id (affiliate_id guarda o BTAG).
  const btags = IRIS_BLOCKS.map((b) => b.btag);
  const { data: campanhas } = await supabase
    .from("campanhas")
    .select("id, affiliate_id")
    .eq("expert_id", expert.id)
    .in("affiliate_id", btags);

  const btagToCampanha = new Map<string, string>();
  for (const c of campanhas ?? []) {
    if (c.affiliate_id) btagToCampanha.set(String(c.affiliate_id), c.id);
  }

  for (const block of IRIS_BLOCKS) {
    if (!btagToCampanha.has(block.btag)) {
      errors.push(
        `Campanha do BTAG ${block.btag} (${block.label}) não encontrada`,
      );
    }
  }

  // Monta as linhas pra upsert, ignorando BTAGs sem campanha cadastrada.
  const now = new Date().toISOString();
  const toUpsert = rows
    .filter((r) => btagToCampanha.has(r.btag))
    .map((r) => ({
      expert_id: expert.id,
      campanha_id: btagToCampanha.get(r.btag)!,
      data: r.data,
      registros: r.registros,
      ftd: r.ftd,
      depositos: r.depositos,
      ngr: r.ngr,
      updated_at: now,
    }));

  let synced = 0;
  if (toUpsert.length > 0) {
    const { error: upErr, count } = await supabase
      .from("metricas_diarias_btag")
      .upsert(toUpsert, { onConflict: "campanha_id,data", count: "exact" });
    if (upErr) {
      return NextResponse.json(
        { error: `Upsert: ${upErr.message}`, errors },
        { status: 500 },
      );
    }
    synced = count ?? toUpsert.length;
  }

  // Sync concluído com sucesso → grava timestamp em sync_status (indicador
  // secundário). expert.id é o uuid da Iris resolvido acima. Falha aqui NÃO
  // derruba a resposta de sucesso: loga e segue.
  const syncedAt = new Date().toISOString();
  const { error: statusErr } = await supabase
    .from("sync_status")
    .upsert(
      { expert_id: expert.id, fonte: "gsheet", synced_at: syncedAt },
      { onConflict: "expert_id,fonte" },
    );
  if (statusErr) {
    console.error(
      `[sync/gsheet/iris] falha ao gravar sync_status: ${statusErr.message}`,
    );
  }

  return NextResponse.json({ synced, errors, synced_at: syncedAt });
}
