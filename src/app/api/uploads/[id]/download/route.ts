import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (!upload?.arquivo_nome) {
    return NextResponse.json(
      { error: "Arquivo não encontrado" },
      { status: 404 },
    );
  }

  const { data: signed, error } = await supabase.storage
    .from("uploads-planilhas")
    .createSignedUrl(upload.arquivo_nome, 60);

  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao gerar URL assinada" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
