import { createClient } from "@/lib/supabase/server";
import { UploadTabs } from "@/components/UploadTabs";

export default async function UploadPage() {
  const supabase = await createClient();
  const { data: experts } = await supabase
    .from("experts")
    .select("id, slug, nome, ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  return (
    <div className="space-y-8">
      <h1 className="text-[32px] font-semibold leading-tight tracking-tight">
        Upload
      </h1>
      <UploadTabs experts={(experts ?? []).map((e) => ({ id: e.id, slug: e.slug, nome: e.nome }))} />
    </div>
  );
}
