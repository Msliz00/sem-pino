import { createClient } from "@/lib/supabase/server";
import { STATUSES } from "@/lib/criativos-validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = [
  "Nome",
  "Data",
  "Expert",
  "Status",
  "Drive URL",
  "Meta Ad ID",
  "Destination URL",
  "ThumbStop",
  "HoldRate",
  "CTR",
  "CPM",
  "CPC",
  "Frequência",
  "Alcance",
  "Impressões",
  "Cliques",
  "Investimento",
  "CPA",
];

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const s = String(value).replace(/"/g, '""');
  return `"${s}"`;
}

function fmtBR(n: unknown, decimals = 2): string {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return "0,00";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtInt(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return "0";
  return Math.round(num).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  });
}

function fmtDateBR(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const expertSlug = searchParams.get("expert");
  const status = searchParams.get("status");
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");

  let query = supabase
    .from("criativos")
    .select(`*, experts:expert_id ( nome )`)
    .order("data_criacao", { ascending: false });

  if (expertSlug && expertSlug !== "todos") {
    const { data: exp } = await supabase
      .from("experts")
      .select("id")
      .eq("slug", expertSlug)
      .maybeSingle();
    if (!exp) {
      const csv = "﻿" + HEADERS.map(csvEscape).join(",") + "\n";
      return new Response(csv, {
        headers: csvHeaders(),
      });
    }
    query = query.eq("expert_id", exp.id);
  }

  if (status && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }

  if (dataInicio) query = query.gte("data_criacao", dataInicio);
  if (dataFim) query = query.lte("data_criacao", dataFim);

  const { data: rows, error } = await query;
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const lines: string[] = [HEADERS.map(csvEscape).join(",")];
  for (const r of rows ?? []) {
    const exp = r.experts as unknown as { nome?: string } | null;
    const cells = [
      r.nome,
      fmtDateBR(r.data_criacao),
      exp?.nome ?? "",
      r.status,
      r.drive_url ?? "",
      r.meta_ad_id ?? "",
      r.destination_url ?? "",
      fmtBR(r.thumbstop),
      fmtBR(r.hold_rate),
      fmtBR(r.ctr),
      fmtBR(r.cpm),
      fmtBR(r.cpc),
      fmtBR(r.frequencia),
      fmtInt(r.alcance),
      fmtInt(r.impressoes),
      fmtInt(r.cliques),
      fmtBR(r.investimento),
      fmtBR(r.cpa),
    ];
    lines.push(cells.map(csvEscape).join(","));
  }

  const csv = "﻿" + lines.join("\n");
  return new Response(csv, { headers: csvHeaders() });
}

function csvHeaders(): HeadersInit {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const filename = `criativos_${y}-${m}-${d}.csv`;
  return {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${filename}"`,
  };
}
