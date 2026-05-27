import { HistoricoView } from "@/components/HistoricoView";

export default function HistoricoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-tight">
        Histórico
      </h1>
      <HistoricoView />
    </div>
  );
}
