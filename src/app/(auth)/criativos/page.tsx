import { CriativosView } from "@/components/CriativosView";
import { PageHeader } from "@/components/PageHeader";

export default function CriativosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Criativos"
        accent="biblioteca"
        subtitle="performance dos criativos publicados"
      />
      <CriativosView />
    </div>
  );
}
