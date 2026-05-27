import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  STATUSES,
  METRIC_FIELDS,
  isDriveUrl,
  isValidMetaAdId,
  isValidUrl,
  type MetricField,
} from "@/lib/criativos-validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.nome !== undefined) {
    if (typeof body.nome !== "string" || !body.nome.trim()) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }
    updates.nome = body.nome.trim();
  }

  if (body.data_criacao !== undefined) {
    if (typeof body.data_criacao !== "string" || !body.data_criacao) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
    updates.data_criacao = body.data_criacao;
  }

  if (body.expert_id !== undefined) {
    if (typeof body.expert_id !== "string" || !body.expert_id) {
      return NextResponse.json({ error: "Expert inválido" }, { status: 400 });
    }
    const { data: exp } = await supabase
      .from("experts")
      .select("id")
      .eq("id", body.expert_id)
      .maybeSingle();
    if (!exp) {
      return NextResponse.json(
        { error: "Expert não encontrado" },
        { status: 400 },
      );
    }
    updates.expert_id = body.expert_id;
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== "string" ||
      !(STATUSES as readonly string[]).includes(body.status)
    ) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 },
      );
    }
    updates.status = body.status;
  }

  if (body.drive_url !== undefined) {
    const v =
      typeof body.drive_url === "string" && body.drive_url.trim()
        ? body.drive_url.trim()
        : null;
    if (v && !isDriveUrl(v)) {
      return NextResponse.json(
        {
          error:
            "Drive URL deve começar com https://drive.google.com ou https://docs.google.com",
        },
        { status: 400 },
      );
    }
    updates.drive_url = v;
  }

  if (body.meta_ad_id !== undefined) {
    const v =
      typeof body.meta_ad_id === "string" && body.meta_ad_id.trim()
        ? body.meta_ad_id.trim()
        : null;
    if (v && !isValidMetaAdId(v)) {
      return NextResponse.json(
        { error: "Meta Ad ID inválido (10-20 dígitos)" },
        { status: 400 },
      );
    }
    updates.meta_ad_id = v;
  }

  if (body.destination_url !== undefined) {
    const v =
      typeof body.destination_url === "string" && body.destination_url.trim()
        ? body.destination_url.trim()
        : null;
    if (v && !isValidUrl(v)) {
      return NextResponse.json(
        { error: "Destination URL inválida" },
        { status: 400 },
      );
    }
    updates.destination_url = v;
  }

  for (const field of METRIC_FIELDS as readonly MetricField[]) {
    if (body[field] !== undefined) {
      const num = Number(body[field]);
      if (Number.isNaN(num) || num < 0) {
        return NextResponse.json(
          { error: `Valor inválido para ${field} (não pode ser negativo)` },
          { status: 400 },
        );
      }
      updates[field] = num;
    }
  }

  // marca outros campos enviados não permitidos? só por garantia, ignora.
  // se nada válido foi enviado:
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo pra atualizar" },
      { status: 400 },
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("criativos")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Criativo não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, criativo: data });
}

export async function DELETE(
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

  const { error } = await supabase.from("criativos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
