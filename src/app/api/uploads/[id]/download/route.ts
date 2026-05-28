import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parsePaths } from "@/lib/storage-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
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
    return NextResponse.json(
      { error: "Arquivo não encontrado" },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const indexRaw = searchParams.get("index");
  const index = indexRaw === null ? 0 : parseInt(indexRaw, 10);

  if (Number.isNaN(index) || index < 0 || index >= paths.length) {
    return NextResponse.json(
      { error: `Index ${indexRaw} fora do range (0..${paths.length - 1})` },
      { status: 404 },
    );
  }

  const { data: signed, error } = await supabase.storage
    .from("uploads-planilhas")
    .createSignedUrl(paths[index], 60);

  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao gerar URL assinada" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
