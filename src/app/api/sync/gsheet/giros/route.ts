import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  insertRowsAboveAnchor,
  type InsertRowsParams,
} from "@/lib/gsheet-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mesmo padrão de auth da rota /iris: Bearer $SYNC_WEBHOOK_TOKEN ou sessão
// Supabase autenticada.
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

type GirosBody = {
  spreadsheet_id?: unknown;
  sheet_name?: unknown;
  anchor_column?: unknown;
  anchor_value?: unknown;
  rows?: unknown;
  total_updates?: unknown;
};

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: GirosBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

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
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json(
      { error: "rows (array não-vazio) é obrigatório" },
      { status: 400 },
    );
  }

  const params: InsertRowsParams = {
    spreadsheetId: body.spreadsheet_id,
    sheetName: body.sheet_name,
    anchorColumn:
      typeof body.anchor_column === "string" ? body.anchor_column : "A",
    anchorValue:
      typeof body.anchor_value === "string" ? body.anchor_value : "TOTAL",
    rows: body.rows as InsertRowsParams["rows"],
    totalUpdates: body.total_updates as InsertRowsParams["totalUpdates"],
  };

  try {
    const result = await insertRowsAboveAnchor(params);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "missing-env" || msg === "invalid-sa-json") {
      return NextResponse.json(
        { error: "Service Account não configurada corretamente" },
        { status: 500 },
      );
    }
    if (msg === "sheet-not-found") {
      return NextResponse.json(
        { error: `Aba '${params.sheetName}' não encontrada` },
        { status: 404 },
      );
    }
    if (msg === "anchor-not-found") {
      return NextResponse.json(
        {
          error: `Linha-âncora '${params.anchorValue}' não encontrada na coluna ${params.anchorColumn}`,
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: msg ? `Sheets API: ${msg}` : "Erro ao inserir linhas" },
      { status: 500 },
    );
  }
}
