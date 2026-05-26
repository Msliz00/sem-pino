import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <h1 className="text-2xl font-semibold">
      Dashboard - logado como: {user?.email}
    </h1>
  );
}
