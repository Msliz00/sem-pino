import { createClient } from "@/lib/supabase/server";
import { UploadTabs } from "@/components/UploadTabs";
import { PageHeader } from "@/components/PageHeader";

export default async function UploadPage() {
  const supabase = await createClient();
  const { data: experts } = await supabase
    .from("experts")
    .select("id, slug, nome, ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload"
        accent="dados"
        subtitle="fluxo de importação · planilhas e criativos"
      />
      <UploadTabs
        experts={(experts ?? []).map((e) => ({
          id: e.id,
          slug: e.slug,
          nome: e.nome,
        }))}
      />
    </div>
  );
}
