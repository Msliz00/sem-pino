import { GestaoView } from "@/components/GestaoView";
import { PageHeader } from "@/components/PageHeader";

export default function GestaoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão"
        accent="experts"
        subtitle="CRUD de experts e campanhas · marcas: BINGO / REALS"
      />
      <GestaoView />
    </div>
  );
}
