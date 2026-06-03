import { google } from "googleapis";

// BTAGs ativos na gSheet gerencial da Iris e suas colunas (DATA, REG, FTD, DEP, NGR).
// Cada bloco ocupa 5 colunas adjacentes; linhas de dados vão de 3 a 33 (até 31 dias).
export const IRIS_BLOCKS = [
  { btag: "38436", label: "BINGO", cols: "AI:AM" },
  { btag: "41400", label: "Iris AV", cols: "AO:AS" },
  { btag: "41954", label: "Recuperação", cols: "AU:AY" },
] as const;

const DATA_FIRST_ROW = 3;
const DATA_LAST_ROW = 33;

// Aba de resumo anual que deve ser ignorada.
const IGNORED_SHEETS = new Set(["2026"]);

export type IrisMetricRow = {
  data: string; // YYYY-MM-DD
  btag: string;
  registros: number;
  ftd: number;
  depositos: number;
  ngr: number;
};

type CellValue = string | number | boolean | null | undefined;

function getSheetsClient() {
  const raw = process.env.GOOGLE_DRIVE_SA_KEY;
  if (!raw) {
    throw new Error("missing-env");
  }
  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("invalid-sa-json");
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("invalid-sa-json");
  }
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

function toNumber(value: CellValue): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "");
    const normalized = cleaned.replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// Converte serial date do Google Sheets (epoch 1899-12-30) pra YYYY-MM-DD em UTC.
function serialToISO(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// A coluna DATA pode vir como serial (UNFORMATTED_VALUE) ou string dd/mm/yyyy.
function parseDateCell(value: CellValue): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    // Serial de data plausível (>= ~2002). Dias soltos (1..31) não dão pra
    // datar com confiança, então são descartados.
    if (value >= 30000) return serialToISO(value);
    return "";
  }
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const dd = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return "";
}

export async function readIrisGSheet(): Promise<IrisMetricRow[]> {
  const spreadsheetId = process.env.GSHEET_IRIS_ID;
  if (!spreadsheetId) {
    throw new Error("missing-gsheet-id");
  }

  const sheets = getSheetsClient();

  // Lista as abas pra processar só as mensais (ignora "2026").
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const monthlySheets = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title ?? "")
    .filter((title) => title && !IGNORED_SHEETS.has(title.trim()));

  if (monthlySheets.length === 0) return [];

  // Monta os ranges de cada bloco em cada aba mensal e busca tudo de uma vez.
  const ranges: string[] = [];
  for (const sheet of monthlySheets) {
    const safe = sheet.replace(/'/g, "''");
    for (const block of IRIS_BLOCKS) {
      const [c1, c2] = block.cols.split(":");
      ranges.push(
        `'${safe}'!${c1}${DATA_FIRST_ROW}:${c2}${DATA_LAST_ROW}`,
      );
    }
  }

  const batch = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  });

  const valueRanges = batch.data.valueRanges ?? [];
  const rows: IrisMetricRow[] = [];

  valueRanges.forEach((vr, idx) => {
    const block = IRIS_BLOCKS[idx % IRIS_BLOCKS.length];
    const grid = (vr.values ?? []) as CellValue[][];

    for (const line of grid) {
      const data = parseDateCell(line[0]);
      const registros = Math.round(toNumber(line[1]));
      const ftd = Math.round(toNumber(line[2]));
      const depositos = toNumber(line[3]);
      const ngr = toNumber(line[4]);

      // Descarta linhas sem data ou com todos os 4 valores zerados.
      if (!data) continue;
      if (registros === 0 && ftd === 0 && depositos === 0 && ngr === 0) {
        continue;
      }

      rows.push({
        data,
        btag: block.btag,
        registros,
        ftd,
        depositos,
        ngr,
      });
    }
  });

  return rows;
}
