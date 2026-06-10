import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeSaldoSheet, type WriteSaldoParams } from "@/lib/gsheet-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mesmo padrão de auth da rota /iris: Bearer $SYNC_WEBHOOK_TOKEN ou sessão
// Supabase autenticada. Sem token na env, o caminho do bearer nunca valida.
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

type SaldoBody = {
  spreadsheet_id?: unknown;
  sheet_name?: unknown;
  title?: unknown;
  header?: unknown;
  rows?: unknown;
  subtotal?: unknown;
  formats?: unknown;
  replace?: unknown;
};

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SaldoBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Validação mínima do contrato.
  if (typeof body.spreadsheet_id !== "string" || !body.spreadsheet_id) {
    return NextResponse.json(
      { error: "spreadsheet_id (string) é obrigatório" },
      { status: 400 },
    );
  }
  if (typeof body.sheet_name !== "string" || !body.sheet_name) {
    return NextResponse.json(
      { error: "sheet_name (string) é obrigatório" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.header) || body.header.length === 0) {
    return NextResponse.json(
      { error: "header (string[]) é obrigatório" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.rows)) {
    return NextResponse.json(
      { error: "rows (array de linhas) é obrigatório" },
      { status: 400 },
    );
  }

  const params: WriteSaldoParams = {
    spreadsheetId: body.spreadsheet_id,
    sheetName: body.sheet_name,
    title: body.title as WriteSaldoParams["title"],
    header: body.header as string[],
    rows: body.rows as WriteSaldoParams["rows"],
    subtotal: body.subtotal as WriteSaldoParams["subtotal"],
    formats: body.formats as WriteSaldoParams["formats"],
    replace: body.replace === true,
  };

  try {
    const result = await writeSaldoSheet(params);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "missing-env" || msg === "invalid-sa-json") {
      return NextResponse.json(
        { error: "Service Account não configurada corretamente" },
        { status: 500 },
      );
    }
    if (msg === "sheet-exists") {
      return NextResponse.json(
        {
          error: `Aba '${params.sheetName}' já existe. Envie replace=true para recriar.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: msg ? `Sheets API: ${msg}` : "Erro ao escrever gSheet" },
      { status: 500 },
    );
  }
}
