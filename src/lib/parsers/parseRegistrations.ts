import * as XLSX from "xlsx";

export interface ParsedData {
  total_registros: number;
  total_ftd: number;
  total_deposits: number;
  total_withdrawn: number;
  total_net_deposits: number;
  total_wagering: number;
  distribuicao_origens: Record<string, { registros: number; ftd: number }>;
  data_referencia: string;
  affiliate_id_detectado: string | null;
}

type RawRow = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
    if (!cleaned) return 0;
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) {
      return new Date(
        parseInt(br[3], 10),
        parseInt(br[2], 10) - 1,
        parseInt(br[1], 10),
      );
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function findKey(keys: string[], target: string): string | null {
  const norm = target.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    keys.find(
      (k) => k.toLowerCase().replace(/\s+/g, " ").trim() === norm,
    ) ?? null
  );
}

export function parseRegistrations(buffer: ArrayBuffer): ParsedData {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Planilha vazia ou inválida.");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    throw new Error("A planilha não contém linhas de dados.");
  }

  const keys = Object.keys(rows[0]);
  const kRegDate = findKey(keys, "Registration Date");
  const kCampain = findKey(keys, "Campain");
  const kFTD = findKey(keys, "FTD");
  const kAffiliate = findKey(keys, "AffiliateId");
  const kDeposits = findKey(keys, "Deposits");
  const kWithdrawn = findKey(keys, "Withdrawn");
  const kNetDeposits = findKey(keys, "Net Deposits");
  const kWagering = findKey(keys, "Wagering");

  const missing: string[] = [];
  if (!kRegDate) missing.push("Registration Date");
  if (!kCampain) missing.push("Campain");
  if (!kFTD) missing.push("FTD");
  if (missing.length > 0) {
    throw new Error(
      `Colunas obrigatórias ausentes: ${missing.join(", ")}.`,
    );
  }

  let total_registros = 0;
  let total_ftd = 0;
  let total_deposits = 0;
  let total_withdrawn = 0;
  let total_net_deposits = 0;
  let total_wagering = 0;
  const distribuicao_origens: Record<
    string,
    { registros: number; ftd: number }
  > = {};
  let minDate: Date | null = null;
  const affiliateCount = new Map<string, number>();

  for (const row of rows) {
    const regDateRaw = row[kRegDate!];
    const date = toDate(regDateRaw);
    if (!date) continue;

    total_registros += 1;

    const ftdRaw = String(row[kFTD!] ?? "").trim().toUpperCase();
    const isFtd = ftdRaw === "Y";
    if (isFtd) total_ftd += 1;

    if (kDeposits) total_deposits += toNumber(row[kDeposits]);
    if (kWithdrawn) total_withdrawn += toNumber(row[kWithdrawn]);
    if (kNetDeposits) total_net_deposits += toNumber(row[kNetDeposits]);
    if (kWagering) total_wagering += toNumber(row[kWagering]);

    const campain = String(row[kCampain!] ?? "").trim() || "(sem origem)";
    const bucket = distribuicao_origens[campain] ?? { registros: 0, ftd: 0 };
    bucket.registros += 1;
    if (isFtd) bucket.ftd += 1;
    distribuicao_origens[campain] = bucket;

    if (!minDate || date.getTime() < minDate.getTime()) {
      minDate = date;
    }

    if (kAffiliate) {
      const aff = String(row[kAffiliate] ?? "").trim();
      if (aff) {
        affiliateCount.set(aff, (affiliateCount.get(aff) ?? 0) + 1);
      }
    }
  }

  if (total_registros === 0 || !minDate) {
    throw new Error(
      "Nenhuma linha válida encontrada (verifique a coluna Registration Date).",
    );
  }

  let affiliate_id_detectado: string | null = null;
  let maxCount = 0;
  for (const [aff, count] of affiliateCount.entries()) {
    if (count > maxCount) {
      maxCount = count;
      affiliate_id_detectado = aff;
    }
  }

  return {
    total_registros,
    total_ftd,
    total_deposits: Math.round(total_deposits * 100) / 100,
    total_withdrawn: Math.round(total_withdrawn * 100) / 100,
    total_net_deposits: Math.round(total_net_deposits * 100) / 100,
    total_wagering: Math.round(total_wagering * 100) / 100,
    distribuicao_origens,
    data_referencia: formatYMD(minDate),
    affiliate_id_detectado,
  };
}
