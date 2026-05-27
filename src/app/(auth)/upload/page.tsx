import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "@/components/UploadForm";

export default async function UploadPage() {
  const supabase = await createClient();
  const { data: experts } = await supabase
    .from("experts")
    .select("slug, nome")
    .order("nome");

  return (
    <div className="space-y-8">
      <h1 className="text-[32px] font-semibold leading-tight tracking-tight">
        Upload
      </h1>
      <UploadForm experts={experts ?? []} />
    </div>
  );
}
