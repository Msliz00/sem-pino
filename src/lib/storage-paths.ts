/**
 * Helpers para parse de paths armazenados em uploads_diarios.arquivo_nome.
 *
 * Formato do path no Supabase Storage:
 *   {expertSlug}/{YYYY-MM-DD}/{BTAG}_{Date.now() 13-digit ms}_{filename}
 *
 * arquivo_nome pode ser:
 *   - string única (uploads single-file legados ou pré-multi-BTAG)
 *   - JSON.stringify(string[]) com N paths (uploads multi-BTAG novos)
 */

export function parsePaths(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return arr.filter((p): p is string => typeof p === "string");
      }
    } catch {
      // fallback: trata como path único
    }
  }
  return [trimmed];
}

export function extractStorageMeta(path: string): {
  btag: string | null;
  fileName: string;
} {
  const last = path.split("/").pop() ?? path;
  // Lazy match no BTAG até achar o timestamp Date.now() (sempre 13 dígitos).
  const m = last.match(/^(.+?)_(\d{13})_(.+)$/);
  if (m) return { btag: m[1], fileName: m[3] };
  return { btag: null, fileName: last };
}
