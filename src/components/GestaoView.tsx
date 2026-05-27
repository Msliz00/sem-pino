"use client";

import { useCallback, useEffect, useState } from "react";
import { ExpertsSection } from "@/components/ExpertsSection";
import { CampanhasSection } from "@/components/CampanhasSection";

type ExpertOption = { id: string; nome: string };

export function GestaoView() {
  const [experts, setExperts] = useState<ExpertOption[]>([]);

  const reloadExperts = useCallback(async () => {
    try {
      const res = await fetch("/api/experts?incluir_inativos=true");
      const d = await res.json();
      if (!res.ok) return;
      setExperts(
        (d.data ?? []).map((e: { id: string; nome: string }) => ({
          id: e.id,
          nome: e.nome,
        })),
      );
    } catch {
      // silencioso — secao de campanhas ainda funciona com lista vazia
    }
  }, []);

  useEffect(() => {
    reloadExperts();
  }, [reloadExperts]);

  return (
    <div className="space-y-10">
      <ExpertsSection onChange={reloadExperts} />
      <CampanhasSection experts={experts} reloadExperts={reloadExperts} />
    </div>
  );
}
