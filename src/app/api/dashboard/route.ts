import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getReferencias,
  getUploadsForDate,
} from "@/lib/dashboard-queries";
import { calcMetricas, ZERO_INPUTS } from "@/lib/metricas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const expert = searchParams.get("expert") || "todos";

  const refs = await getReferencias();
  const hojeInputs = await getUploadsForDate(expert, refs.hoje);
  const ontemInputs = await getUploadsForDate(expert, refs.ontem);

  return NextResponse.json({
    hoje: calcMetricas(hojeInputs ?? ZERO_INPUTS),
    ontem: ontemInputs ? calcMetricas(ontemInputs) : null,
    dataReferencia: refs.hoje,
    hasData: !!hojeInputs,
  });
}
