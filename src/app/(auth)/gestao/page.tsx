import { GestaoView } from "@/components/GestaoView";

export default function GestaoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-tight">
        Gestão
      </h1>
      <GestaoView />
    </div>
  );
}
