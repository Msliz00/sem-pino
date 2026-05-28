import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parsePaths, extractStorageMeta } from "@/lib/storage-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FileEntry = {
  index: number;
  path: string;
  btag: string | null;
  file_name: string;
  signed_url: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: upload } = await supabase
    .from("uploads_diarios")
    .select("arquivo_nome")
    .eq("id", id)
    .maybeSingle();

  const paths = parsePaths(upload?.arquivo_nome ?? null);
  if (paths.length === 0) {
    return NextResponse.json({ files: [] });
  }

  const files: FileEntry[] = await Promise.all(
    paths.map(async (path, idx) => {
      const { btag, fileName } = extractStorageMeta(path);
      const { data: signed } = await supabase.storage
        .from("uploads-planilhas")
        .createSignedUrl(path, 60);
      return {
        index: idx,
        path,
        btag,
        file_name: fileName,
        signed_url: signed?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ files });
}
