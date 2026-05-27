export const META_AD_ID_RE = /^[0-9]{10,20}$/;
export const STATUSES = ["ATIVO", "DESCARTE", "PENDENTE"] as const;
export type CriativoStatus = (typeof STATUSES)[number];

export const METRIC_FIELDS = [
  "thumbstop",
  "hold_rate",
  "ctr",
  "cpm",
  "cpc",
  "frequencia",
  "alcance",
  "impressoes",
  "cliques",
  "investimento",
  "cpa",
] as const;

export type MetricField = (typeof METRIC_FIELDS)[number];

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isDriveUrl(value: string): boolean {
  return (
    value.startsWith("https://drive.google.com") ||
    value.startsWith("https://docs.google.com")
  );
}

export function isValidMetaAdId(value: string): boolean {
  return META_AD_ID_RE.test(value);
}
