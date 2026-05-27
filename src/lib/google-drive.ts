import { google } from "googleapis";

export const SA_EMAIL_FALLBACK =
  "painel-drive-reader@experts-painel-drive.iam.gserviceaccount.com";

export function extractFolderId(url: string): string | null {
  const m = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export function stripExtension(name: string): string {
  return name.replace(/\.[a-zA-Z0-9]{1,5}$/, "");
}

export function getDriveClient() {
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
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export function saEmail(): string {
  return process.env.GOOGLE_DRIVE_SA_EMAIL ?? SA_EMAIL_FALLBACK;
}
