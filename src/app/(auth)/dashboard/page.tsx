import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-2">
      <h1 className="text-[32px] font-semibold leading-tight tracking-tight">
        Dashboard
      </h1>
      <p className="text-sm text-muted">
        logado como{" "}
        <span className="font-mono text-snow/80">{user?.email}</span>
      </p>
    </div>
  );
}
