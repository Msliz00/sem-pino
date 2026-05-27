"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UploadForm } from "@/components/UploadForm";
import {
  CriativoForm,
  type ExpertOption as CriativoExpert,
} from "@/components/CriativoForm";

type Expert = { id: string; slug: string; nome: string };

type Tab = "upload" | "criativos";

function TabsInner({ experts }: { experts: Expert[] }) {
  const params = useSearchParams();
  const initial: Tab =
    params.get("tab") === "criativos" ? "criativos" : "upload";
  const [tab, setTab] = useState<Tab>(initial);

  const uploadExperts = experts.map(({ slug, nome }) => ({ slug, nome }));
  const criativoExperts: CriativoExpert[] = experts;

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-white/[0.08]">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`relative px-4 py-2 text-sm transition-colors ${
            tab === "upload"
              ? "text-snow"
              : "text-muted hover:text-snow"
          }`}
        >
          Upload Diário
          {tab === "upload" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-bingo" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("criativos")}
          className={`relative px-4 py-2 text-sm transition-colors ${
            tab === "criativos"
              ? "text-snow"
              : "text-muted hover:text-snow"
          }`}
        >
          Cadastro de Criativos
          {tab === "criativos" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-bingo" />
          )}
        </button>
      </div>

      {tab === "upload" ? (
        <UploadForm experts={uploadExperts} />
      ) : (
        <CriativoForm experts={criativoExperts} />
      )}
    </div>
  );
}

export function UploadTabs({ experts }: { experts: Expert[] }) {
  return (
    <Suspense fallback={null}>
      <TabsInner experts={experts} />
    </Suspense>
  );
}
