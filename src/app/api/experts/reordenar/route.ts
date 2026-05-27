import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { ordem?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!Array.isArray(body.ordem)) {
    return NextResponse.json(
      { error: "Body deve conter array `ordem`" },
      { status: 400 },
    );
  }

  const items = body.ordem.filter(
    (
      item,
    ): item is { id: string; ordem: number } =>
      !!item &&
      typeof (item as Record<string, unknown>).id === "string" &&
      typeof (item as Record<string, unknown>).ordem === "number",
  );

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Nenhum item válido na ordem" },
      { status: 400 },
    );
  }

  for (const { id, ordem } of items) {
    const { error } = await supabase
      .from("experts")
      .update({ ordem })
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: `Falha ao atualizar ${id}: ${error.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, updated: items.length });
}
