import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractFolderId,
  getDriveClient,
  saEmail,
  stripExtension,
} from "@/lib/google-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DriveItem = { nome: string; drive_url: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { folder_url?: unknown; expert_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const folderUrl =
    typeof body.folder_url === "string" ? body.folder_url.trim() : "";
  const expertId =
    typeof body.expert_id === "string" ? body.expert_id.trim() : "";

  if (!folderUrl) {
    return NextResponse.json(
      { error: "URL da pasta obrigatória" },
      { status: 400 },
    );
  }
  if (!expertId) {
    return NextResponse.json(
      { error: "Expert obrigatório" },
      { status: 400 },
    );
  }

  const folderId = extractFolderId(folderUrl);
  if (!folderId) {
    return NextResponse.json(
      { error: "URL não parece ser de pasta do Drive" },
      { status: 400 },
    );
  }

  const { data: expert } = await supabase
    .from("experts")
    .select("id")
    .eq("id", expertId)
    .maybeSingle();
  if (!expert) {
    return NextResponse.json(
      { error: "Expert não encontrado" },
      { status: 400 },
    );
  }

  let drive;
  try {
    drive = getDriveClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "missing-env" || msg === "invalid-sa-json") {
      return NextResponse.json(
        { error: "Service Account não configurada corretamente" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao inicializar Google Drive" },
      { status: 500 },
    );
  }

  let folderName = "(sem nome)";
  let files: { id?: string | null; name?: string | null; mimeType?: string | null; webViewLink?: string | null }[] =
    [];

  try {
    const folderInfo = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    });
    folderName = folderInfo.data.name ?? folderName;

    const list = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType, webViewLink)",
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    files = list.data.files ?? [];
  } catch (e: unknown) {
    const status =
      typeof e === "object" && e !== null && "code" in e
        ? Number((e as { code: number }).code)
        : 0;
    if (status === 403 || status === 404) {
      return NextResponse.json(
        {
          error: `Pasta não compartilhada com a Service Account. Compartilhe com: ${saEmail()}`,
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Drive API: ${e.message}`
            : "Erro ao listar arquivos do Drive",
      },
      { status: 500 },
    );
  }

  const filtered = files.filter(
    (f) =>
      f.mimeType && f.mimeType !== "application/vnd.google-apps.folder" && f.name,
  );

  const items: DriveItem[] = filtered.map((f) => ({
    nome: stripExtension(f.name ?? ""),
    drive_url: f.webViewLink ?? "",
  }));

  // checa duplicados (mesmo expert + mesmo nome)
  const nomes = items.map((i) => i.nome);
  let duplicadosSet = new Set<string>();
  if (nomes.length > 0) {
    const { data: existing } = await supabase
      .from("criativos")
      .select("nome")
      .eq("expert_id", expertId)
      .in("nome", nomes);
    duplicadosSet = new Set((existing ?? []).map((r) => r.nome));
  }

  const novos: DriveItem[] = [];
  const duplicados: DriveItem[] = [];
  for (const it of items) {
    if (duplicadosSet.has(it.nome)) {
      duplicados.push(it);
    } else {
      novos.push(it);
    }
  }

  return NextResponse.json({
    folder_name: folderName,
    total_encontrados: items.length,
    novos,
    duplicados,
  });
}
