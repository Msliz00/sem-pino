/**
 * Testa extractBtagFromFileName: extrai BTAG do nome do arquivo (não da
 * coluna AffiliateId, que vem suja da BingoBet).
 *
 * Espelha src/lib/btag-from-filename.ts.
 *
 * Rodar: node --test __tests__/btagFromFilename.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert";

// Cópia idêntica de src/lib/btag-from-filename.ts
function extractBtagFromFileName(name) {
  const nameWithoutExt = name.replace(/\.[a-zA-Z0-9]{1,5}$/, "");
  const stripped = nameWithoutExt
    .replace(/(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)/g, " ")
    .replace(/(?<!\d)\d{2}-\d{2}-\d{4}(?!\d)/g, " ")
    .replace(/(?<!\d)\d{2}\/\d{2}\/\d{4}(?!\d)/g, " ")
    .replace(/(?<!\d)\d{8}(?!\d)/g, " ");
  const matches = stripped.match(/(?<!\d)\d{4,6}(?!\d)/g) ?? [];
  if (matches.length === 0) {
    return { btag: null, candidatos: [], error: "Nenhum BTAG identificável" };
  }
  if (matches.length > 1) {
    return { btag: null, candidatos: matches, error: "Múltiplos candidatos" };
  }
  return { btag: matches[0], candidatos: matches, error: null };
}

test("Iris AV 41400 BINGO.xlsx → 41400", () => {
  const r = extractBtagFromFileName("Iris AV 41400 BINGO.xlsx");
  assert.strictEqual(r.btag, "41400");
  assert.strictEqual(r.error, null);
});

test("IRIS AV 38436 BINGO.xlsx → 38436", () => {
  const r = extractBtagFromFileName("IRIS AV 38436 BINGO.xlsx");
  assert.strictEqual(r.btag, "38436");
});

test("Iris recuperação 41954 BINGO.xlsx → 41954", () => {
  const r = extractBtagFromFileName("Iris recuperação 41954 BINGO.xlsx");
  assert.strictEqual(r.btag, "41954");
});

test("BTAG só dígitos (4-dígitos): cenário borda", () => {
  const r = extractBtagFromFileName("planilha 1234.xlsx");
  assert.strictEqual(r.btag, "1234");
});

test("BTAG só dígitos (6-dígitos): cenário borda", () => {
  const r = extractBtagFromFileName("export 123456 bingo.xlsx");
  assert.strictEqual(r.btag, "123456");
});

test("3 dígitos não conta (abaixo do mínimo)", () => {
  const r = extractBtagFromFileName("test 123 file.xlsx");
  assert.strictEqual(r.btag, null);
  assert.ok(r.error?.includes("Nenhum"));
});

test("7 dígitos não conta (acima do máximo)", () => {
  const r = extractBtagFromFileName("test 1234567 file.xlsx");
  assert.strictEqual(r.btag, null);
});

test("Nenhum número → null com erro", () => {
  const r = extractBtagFromFileName("no_btag_here.xlsx");
  assert.strictEqual(r.btag, null);
  assert.ok(r.error?.includes("Nenhum"));
});

test("Múltiplos candidatos → ambíguo (null com erro)", () => {
  const r = extractBtagFromFileName("file 41400 versus 38485.xlsx");
  assert.strictEqual(r.btag, null);
  assert.ok(r.error?.includes("Múltiplos"));
  assert.deepStrictEqual(r.candidatos, ["41400", "38485"]);
});

test("Filename com data YYYY-MM-DD: ignora a data, pega BTAG", () => {
  const r = extractBtagFromFileName("registrations_2026-05-22_41400.xlsx");
  assert.strictEqual(r.btag, "41400");
});

test("Filename com data DD/MM/YYYY: ignora", () => {
  const r = extractBtagFromFileName("export 22/05/2026 41400.xlsx");
  assert.strictEqual(r.btag, "41400");
});

test("Filename com data YYYYMMDD compactada: ignora", () => {
  const r = extractBtagFromFileName("iris_20260522_41400.xlsx");
  assert.strictEqual(r.btag, "41400");
});

test("CSV em vez de XLSX", () => {
  const r = extractBtagFromFileName("Iris 41400.csv");
  assert.strictEqual(r.btag, "41400");
});

test("Sem extensão", () => {
  const r = extractBtagFromFileName("Iris 41400");
  assert.strictEqual(r.btag, "41400");
});

test("Hífens e underscores como separadores", () => {
  const r = extractBtagFromFileName("iris-aviator_41400-bingo.xlsx");
  assert.strictEqual(r.btag, "41400");
});

test("Espaços múltiplos não confundem", () => {
  const r = extractBtagFromFileName("Iris    AV    41400    BINGO.xlsx");
  assert.strictEqual(r.btag, "41400");
});
