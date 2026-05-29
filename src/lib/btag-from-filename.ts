/**
 * Extrai o BTAG do nome do arquivo de planilha.
 *
 * Regra de negócio:
 *   O nome do arquivo é a fonte de verdade do BTAG (confirmado em 2026-05-28).
 *   A coluna AffiliateId interna da planilha vem inconsistente da BingoBet e
 *   serve apenas como sinal de alerta (warning amarelo na UI quando diverge).
 *
 * Heurística:
 *   1. Remove extensão (.xlsx/.csv/etc)
 *   2. Strip de datas comuns (YYYY-MM-DD, DD/MM/YYYY, YYYYMMDD) pra evitar
 *      falsos positivos como ano "2026"
 *   3. Procura sequências de 4-6 dígitos com word boundary
 *   4. Se zero matches → null com erro
 *   5. Se múltiplos matches → null com erro (ambíguo, user renomeia)
 *   6. Se exatamente um → esse é o BTAG
 */

export type BtagExtractResult = {
  btag: string | null;
  candidatos: string[];
  error: string | null;
};

export function extractBtagFromFileName(name: string): BtagExtractResult {
  const nameWithoutExt = name.replace(/\.[a-zA-Z0-9]{1,5}$/, "");
  // Strip de datas usando lookbehind/lookahead pra "isolamento de dígitos",
  // já que \b em JS não cria boundary entre `_` e dígito (ambos são \w).
  const stripped = nameWithoutExt
    .replace(/(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)/g, " ") // YYYY-MM-DD
    .replace(/(?<!\d)\d{2}-\d{2}-\d{4}(?!\d)/g, " ") // DD-MM-YYYY
    .replace(/(?<!\d)\d{2}\/\d{2}\/\d{4}(?!\d)/g, " ") // DD/MM/YYYY
    .replace(/(?<!\d)\d{8}(?!\d)/g, " "); // YYYYMMDD compactada

  // Match de 4-6 dígitos isolados (não dentro de uma sequência maior).
  const matches = stripped.match(/(?<!\d)\d{4,6}(?!\d)/g) ?? [];

  if (matches.length === 0) {
    return {
      btag: null,
      candidatos: [],
      error:
        "Nenhum BTAG identificável no nome do arquivo (esperado: sequência de 4-6 dígitos).",
    };
  }
  if (matches.length > 1) {
    return {
      btag: null,
      candidatos: matches,
      error: `Múltiplos candidatos a BTAG no nome: ${matches.join(", ")}. Renomeie o arquivo deixando apenas o BTAG correto.`,
    };
  }
  return { btag: matches[0]!, candidatos: matches, error: null };
}
