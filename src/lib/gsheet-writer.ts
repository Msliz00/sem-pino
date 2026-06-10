import { google, sheets_v4 } from "googleapis";

// Cliente de ESCRITA do Sheets. Reusa a MESMA service account de leitura
// (GOOGLE_DRIVE_SA_KEY), mas pede o escopo read/write `spreadsheets`. Pra
// escrever de fato, a planilha-alvo precisa estar compartilhada com o e-mail
// do SA como EDITOR — caso contrário o batchUpdate retorna 403.
function getSheetsWriteClient(): sheets_v4.Sheets {
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// Identidade visual "Play". Amarelo da marca e fonte padrão.
const BRAND_YELLOW = "#F4C430";
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const FONT = "Play";

type CellValue = string | number | boolean | null;

export type SaldoFormats = {
  // Colunas (letras A..Z) que recebem moeda R$ #,##0.00.
  currency_columns?: string[];
  // Colunas que recebem data dd/mm/yyyy.
  date_columns?: string[];
};

export type SaldoTitle = {
  text: string;
  // Quantas colunas mesclar a partir de A1 (ex.: 7 => A1:G1).
  merge_columns: number;
};

export type WriteSaldoParams = {
  spreadsheetId: string;
  sheetName: string;
  title?: SaldoTitle;
  header: string[];
  // Linhas de dados. Strings iniciadas por "=" viram fórmula (USER_ENTERED).
  rows: CellValue[][];
  // Linha de subtotal (mesma largura do header). Opcional.
  subtotal?: CellValue[];
  formats?: SaldoFormats;
  // Se a aba já existir: true apaga e recria; false (padrão) retorna erro.
  replace?: boolean;
};

export type WriteSaldoResult = {
  spreadsheetId: string;
  sheetName: string;
  sheetId: number;
  updatedRange: string;
  updatedCells: number;
  updatedRows: number;
  updatedColumns: number;
  replaced: boolean;
};

// "#RRGGBB" -> {red,green,blue} normalizado 0..1 pro Sheets API.
function hexToRgb(hex: string): sheets_v4.Schema$Color {
  const h = hex.replace("#", "");
  return {
    red: parseInt(h.slice(0, 2), 16) / 255,
    green: parseInt(h.slice(2, 4), 16) / 255,
    blue: parseInt(h.slice(4, 6), 16) / 255,
  };
}

// "A" -> 0, "B" -> 1, ... (apenas 1ª letra; suficiente pro layout SALDO).
function colToIndex(col: string): number {
  return col.trim().toUpperCase().charCodeAt(0) - 65;
}

// CellFormat reaproveitado pros papéis de linha (título/cabeçalho/subtotal/dados).
function roleFormat(opts: {
  bg: string;
  fg: string;
  bold: boolean;
  fontSize?: number;
}): sheets_v4.Schema$CellFormat {
  return {
    backgroundColor: hexToRgb(opts.bg),
    horizontalAlignment: "CENTER",
    verticalAlignment: "MIDDLE",
    textFormat: {
      fontFamily: FONT,
      bold: opts.bold,
      fontSize: opts.fontSize,
      foregroundColor: hexToRgb(opts.fg),
    },
  };
}

function gridRange(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
): sheets_v4.Schema$GridRange {
  return {
    sheetId,
    startRowIndex: startRow,
    endRowIndex: endRow,
    startColumnIndex: startCol,
    endColumnIndex: endCol,
  };
}

function repeatCell(
  range: sheets_v4.Schema$GridRange,
  format: sheets_v4.Schema$CellFormat,
  fields: string,
): sheets_v4.Schema$Request {
  return { repeatCell: { range, cell: { userEnteredFormat: format }, fields } };
}

export async function writeSaldoSheet(
  params: WriteSaldoParams,
): Promise<WriteSaldoResult> {
  const { spreadsheetId, sheetName, title, header, rows, subtotal, formats } =
    params;

  const numCols = Math.max(
    header.length,
    title?.merge_columns ?? 0,
    ...rows.map((r) => r.length),
    subtotal?.length ?? 0,
  );

  const sheets = getSheetsWriteClient();

  // Layout de linhas (0-based):
  //   0: título · 1: cabeçalho · 2..(2+n-1): dados · 2+n: subtotal
  const dataStart = 2;
  const dataEnd = dataStart + rows.length; // exclusivo
  const subtotalRow = subtotal ? dataEnd : -1;
  const totalRows = (subtotal ? dataEnd + 1 : dataEnd) + 2; // folga visual

  // 1) Aba já existe? Decide entre apagar/recriar ou abortar.
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const existing = (meta.data.sheets ?? []).find(
    (s) => s.properties?.title === sheetName,
  );
  let replaced = false;
  if (existing) {
    if (!params.replace) {
      throw new Error("sheet-exists");
    }
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          { deleteSheet: { sheetId: existing.properties!.sheetId! } },
        ],
      },
    });
    replaced = true;
  }

  // 2) Cria a aba com gridlines ocultas e dimensões adequadas.
  const addResp = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
              gridProperties: {
                rowCount: Math.max(totalRows, 10),
                columnCount: Math.max(numCols, 1),
                hideGridlines: true,
              },
            },
          },
        },
      ],
    },
  });
  const sheetId =
    addResp.data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
  if (sheetId === null) {
    throw new Error("addSheet-no-id");
  }

  // 3) Escreve os valores (USER_ENTERED pra fórmulas e datas serem interpretadas).
  const grid: CellValue[][] = [];
  grid.push(title ? [title.text] : []); // título mora em A1 (mesclado)
  grid.push(header);
  for (const r of rows) grid.push(r);
  if (subtotal) grid.push(subtotal);

  const valuesResp = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName.replace(/'/g, "''")}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: grid },
  });

  // 4) Formatação (identidade Play). Ordem importa: papéis primeiro (cores/fonte),
  //    depois number formats com fields estreito pra não apagar as cores.
  const requests: sheets_v4.Schema$Request[] = [];

  // Título: mescla A1:<numCols> e formata 18/negrito/preto sobre amarelo.
  if (title) {
    const mergeCols = title.merge_columns || numCols;
    requests.push({
      mergeCells: {
        range: gridRange(sheetId, 0, 1, 0, mergeCols),
        mergeType: "MERGE_ALL",
      },
    });
    requests.push(
      repeatCell(
        gridRange(sheetId, 0, 1, 0, mergeCols),
        roleFormat({ bg: BRAND_YELLOW, fg: BLACK, bold: true, fontSize: 18 }),
        "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)",
      ),
    );
  }

  const roleFields =
    "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)";

  // Cabeçalho (linha 1): negrito, preto sobre amarelo.
  requests.push(
    repeatCell(
      gridRange(sheetId, 1, 2, 0, numCols),
      roleFormat({ bg: BRAND_YELLOW, fg: BLACK, bold: true }),
      roleFields,
    ),
  );

  // Dados: branco sobre preto.
  if (rows.length > 0) {
    requests.push(
      repeatCell(
        gridRange(sheetId, dataStart, dataEnd, 0, numCols),
        roleFormat({ bg: BLACK, fg: WHITE, bold: false }),
        roleFields,
      ),
    );
  }

  // Subtotal: negrito, preto sobre amarelo.
  if (subtotalRow >= 0) {
    requests.push(
      repeatCell(
        gridRange(sheetId, subtotalRow, subtotalRow + 1, 0, numCols),
        roleFormat({ bg: BRAND_YELLOW, fg: BLACK, bold: true }),
        roleFields,
      ),
    );
  }

  // Number formats por coluna, cobrindo dados + subtotal. fields estreito.
  const lastRow = subtotalRow >= 0 ? subtotalRow + 1 : dataEnd;
  for (const col of formats?.currency_columns ?? []) {
    const c = colToIndex(col);
    requests.push(
      repeatCell(
        gridRange(sheetId, dataStart, lastRow, c, c + 1),
        { numberFormat: { type: "NUMBER", pattern: "R$ #,##0.00" } },
        "userEnteredFormat.numberFormat",
      ),
    );
  }
  for (const col of formats?.date_columns ?? []) {
    const c = colToIndex(col);
    requests.push(
      repeatCell(
        gridRange(sheetId, dataStart, lastRow, c, c + 1),
        { numberFormat: { type: "DATE", pattern: "dd/mm/yyyy" } },
        "userEnteredFormat.numberFormat",
      ),
    );
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  return {
    spreadsheetId,
    sheetName,
    sheetId,
    updatedRange: valuesResp.data.updatedRange ?? "",
    updatedCells: valuesResp.data.updatedCells ?? 0,
    updatedRows: valuesResp.data.updatedRows ?? 0,
    updatedColumns: valuesResp.data.updatedColumns ?? 0,
    replaced,
  };
}
