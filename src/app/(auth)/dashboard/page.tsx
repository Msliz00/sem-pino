import {
  getReferencias,
  getUploadsForDate,
} from "@/lib/dashboard-queries";
import { calcMetricas, ZERO_INPUTS } from "@/lib/metricas";
import { DashboardGrid } from "@/components/DashboardGrid";
import { PageHeader } from "@/components/PageHeader";

export default async function DashboardPage() {
  const refs = await getReferencias();
  const hojeInputs = await getUploadsForDate("todos", refs.hoje);
  const ontemInputs = await getUploadsForDate("todos", refs.ontem);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        accent="Experts"
        subtitle="visão consolidada · todos os experts"
        dynamicAccent
      />
      <DashboardGrid
        initial={{
          hoje: calcMetricas(hojeInputs ?? ZERO_INPUTS),
          ontem: ontemInputs ? calcMetricas(ontemInputs) : null,
          dataReferencia: refs.hoje,
          hasData: !!hojeInputs,
        }}
      />
    </div>
  );
}
