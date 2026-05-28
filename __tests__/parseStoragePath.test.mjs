/**
 * Testa o regex de parse de paths do Supabase Storage.
 *
 * Espelha EXATAMENTE a lógica de src/lib/storage-paths.ts. Qualquer
 * mudança no lib precisa refletir aqui.
 *
 * Rodar: node --test __tests__/parseStoragePath.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert";

// ---- Copia idêntica de src/lib/storage-paths.ts ----
function parsePaths(raw) {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return arr.filter((p) => typeof p === "string");
      }
    } catch {
      // fallback
    }
  }
  return [trimmed];
}

function extractStorageMeta(path) {
  const last = path.split("/").pop() ?? path;
  const m = last.match(/^(.+?)_(\d{13})_(.+)$/);
  if (m) return { btag: m[1], fileName: m[3] };
  return { btag: null, fileName: last };
}
// ----------------------------------------------------

const TS = "1735234567890"; // exemplo de Date.now() em millis (13 dígitos)

test("BTAG 41400 (Iris Aviator real)", () => {
  const path = `iris-aviator/2026-05-22/41400_${TS}_registrations.xlsx`;
  const meta = extractStorageMeta(path);
  assert.strictEqual(meta.btag, "41400");
  assert.strictEqual(meta.fileName, "registrations.xlsx");
});

test("BTAG 38436 (Iris BTAG #2)", () => {
  const path = `iris-aviator/2026-05-22/38436_${TS}_iris_btag2.xlsx`;
  const meta = extractStorageMeta(path);
  assert.strictEqual(meta.btag, "38436");
  assert.strictEqual(meta.fileName, "iris_btag2.xlsx");
});

test("BTAG UX-37454 (com hífen — Professor LUCASAVIATOR)", () => {
  const path = `professor/2026-05-22/UX-37454_${TS}_lucasaviator_export.xlsx`;
  const meta = extractStorageMeta(path);
  assert.strictEqual(meta.btag, "UX-37454");
  assert.strictEqual(meta.fileName, "lucasaviator_export.xlsx");
});

test("BTAG com underscore interno (iris_41400)", () => {
  const path = `iris-aviator/2026-05-22/iris_41400_${TS}_export.xlsx`;
  const meta = extractStorageMeta(path);
  assert.strictEqual(meta.btag, "iris_41400");
  assert.strictEqual(meta.fileName, "export.xlsx");
});

test("BTAG só dígitos 6-dígitos (cenário futuro)", () => {
  const path = `expert/2026-05-22/123456_${TS}_planilha.xlsx`;
  const meta = extractStorageMeta(path);
  assert.strictEqual(meta.btag, "123456");
  assert.strictEqual(meta.fileName, "planilha.xlsx");
});

test("filename com timestamp embutido não confunde", () => {
  const path = `expert/2026-05-22/41400_${TS}_registrations_20260522.xlsx`;
  const meta = extractStorageMeta(path);
  assert.strictEqual(meta.btag, "41400");
  assert.strictEqual(meta.fileName, "registrations_20260522.xlsx");
});

test("path com hífen no slug do expert", () => {
  const path = `iris-aviator-pro/2026-05-22/41400_${TS}_export.xlsx`;
  const meta = extractStorageMeta(path);
  assert.strictEqual(meta.btag, "41400");
  assert.strictEqual(meta.fileName, "export.xlsx");
});

test("legacy: path sem padrão (single-file pré-multi-BTAG)", () => {
  const path = "professor/2026-05-22/registrations.xlsx";
  const meta = extractStorageMeta(path);
  assert.strictEqual(meta.btag, null);
  assert.strictEqual(meta.fileName, "registrations.xlsx");
});

test("parsePaths: JSON array com 3 paths (Iris 3 BTAGs)", () => {
  const raw = JSON.stringify([
    `iris-aviator/2026-05-22/41400_${TS}_iris1.xlsx`,
    `iris-aviator/2026-05-22/38436_${TS}_iris2.xlsx`,
    `iris-aviator/2026-05-22/29981_${TS}_iris3.xlsx`,
  ]);
  const paths = parsePaths(raw);
  assert.strictEqual(paths.length, 3);
  assert.ok(paths[0].includes("41400"));
  assert.ok(paths[1].includes("38436"));
  assert.ok(paths[2].includes("29981"));
});

test("parsePaths: legacy string única (não JSON)", () => {
  const raw = "professor/2026-05-22/registrations.xlsx";
  const paths = parsePaths(raw);
  assert.deepStrictEqual(paths, [raw]);
});

test("parsePaths: null/undefined retorna array vazio", () => {
  assert.deepStrictEqual(parsePaths(null), []);
  assert.deepStrictEqual(parsePaths(undefined), []);
  assert.deepStrictEqual(parsePaths(""), []);
});

test("parsePaths: JSON inválido cai no fallback (path único)", () => {
  const raw = "[broken json";
  const paths = parsePaths(raw);
  assert.deepStrictEqual(paths, [raw]);
});

test("parsePaths: JSON com tipos mistos filtra só strings", () => {
  const raw = JSON.stringify([
    "professor/2026-05-22/a.xlsx",
    123,
    null,
    "professor/2026-05-22/b.xlsx",
  ]);
  const paths = parsePaths(raw);
  assert.strictEqual(paths.length, 2);
  assert.strictEqual(paths[0], "professor/2026-05-22/a.xlsx");
  assert.strictEqual(paths[1], "professor/2026-05-22/b.xlsx");
});

test("end-to-end: 3 planilhas da Iris (cenário real do user)", () => {
  const raw = JSON.stringify([
    `iris-aviator/2026-05-22/41400_${TS}_planilha_btag_41400.xlsx`,
    `iris-aviator/2026-05-22/38436_${TS}_planilha_btag_38436.xlsx`,
    `iris-aviator/2026-05-22/29981_${TS}_planilha_btag_29981.xlsx`,
  ]);
  const paths = parsePaths(raw);
  const metas = paths.map(extractStorageMeta);
  assert.deepStrictEqual(metas, [
    { btag: "41400", fileName: "planilha_btag_41400.xlsx" },
    { btag: "38436", fileName: "planilha_btag_38436.xlsx" },
    { btag: "29981", fileName: "planilha_btag_29981.xlsx" },
  ]);
});
