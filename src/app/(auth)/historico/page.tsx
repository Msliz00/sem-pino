import { HistoricoView } from "@/components/HistoricoView";
import { PageHeader } from "@/components/PageHeader";

export default function HistoricoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico"
        accent="diário"
        subtitle="série temporal de métricas"
      />
      <HistoricoView />
    </div>
  );
}
