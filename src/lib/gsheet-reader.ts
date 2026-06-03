import { google } from "googleapis";

// BTAGs ativos na gSheet gerencial da Iris. Cada bloco ocupa 5 colunas
// adjacentes (DATA, REG, FTD, DEP, NGR) a partir de `startCol` (índice 0-based):
//   38436 -> col AI (34) · 41400 -> col AO (40) · 41954 -> col AU (46)
// Linhas de dados vão de 3 a 33 (até 31 dias por mês).
export const BLOCK_WIDTH = 5;

export const IRIS_BLOCKS = [
  { btag: "38436", label: "BINGO", startCol: 34 },
  { btag: "41400", label: "Iris AV", startCol: 40 },
  { btag: "41954", label: "Recuperação", startCol: 46 },
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

  // Lista as abas mensais (ignora "2026") junto com a largura real do grid,
  // pra não pedir colunas além do que cada aba tem.
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,gridProperties.columnCount)",
  });
  const monthlySheets = (meta.data.sheets ?? [])
    .map((s) => ({
      title: s.properties?.title ?? "",
      columnCount: s.properties?.gridProperties?.columnCount ?? 0,
    }))
    .filter((s) => s.title && !IGNORED_SHEETS.has(s.title.trim()));

  if (monthlySheets.length === 0) return [];

  // Busca o grid completo de cada aba (range só por linha, a partir da col A),
  // depois fatia os 3 blocos de BTAG em memória. Assim larguras de aba
  // variáveis não quebram a leitura.
  const ranges = monthlySheets.map(
    (s) => `'${s.title.replace(/'/g, "''")}'!${DATA_FIRST_ROW}:${DATA_LAST_ROW}`,
  );

  const batch = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  });

  const valueRanges = batch.data.valueRanges ?? [];
  const rows: IrisMetricRow[] = [];

  monthlySheets.forEach((sheet, idx) => {
    const grid = (valueRanges[idx]?.values ?? []) as CellValue[][];
    let blocksRead = 0;

    for (const block of IRIS_BLOCKS) {
      // Só lê o bloco se a aba tiver colunas suficientes pra cobri-lo inteiro.
      if (sheet.columnCount < block.startCol + BLOCK_WIDTH) continue;
      blocksRead++;

      for (const line of grid) {
        const cells = line.slice(block.startCol, block.startCol + BLOCK_WIDTH);
        const data = parseDateCell(cells[0]);
        const registros = Math.round(toNumber(cells[1]));
        const ftd = Math.round(toNumber(cells[2]));
        const depositos = toNumber(cells[3]);
        const ngr = toNumber(cells[4]);

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
    }

    console.log(
      `[gsheet-reader] aba "${sheet.title}" (${sheet.columnCount} cols): ${blocksRead}/${IRIS_BLOCKS.length} BTAGs lidos`,
    );
  });

  return rows;
}
