"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UploadForm } from "@/components/UploadForm";
import {
  CriativoForm,
  type ExpertOption as CriativoExpert,
} from "@/components/CriativoForm";
import { DriveImportForm } from "@/components/DriveImportForm";

type Expert = { id: string; slug: string; nome: string };

type Tab = "upload" | "criativos" | "drive";

function TabsInner({ experts }: { experts: Expert[] }) {
  const params = useSearchParams();
  const initial: Tab =
    params.get("tab") === "criativos"
      ? "criativos"
      : params.get("tab") === "drive"
        ? "drive"
        : "upload";
  const [tab, setTab] = useState<Tab>(initial);

  const criativoExperts: CriativoExpert[] = experts;

  const renderTab = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`relative px-4 py-2 text-sm transition-colors ${
        tab === id ? "text-snow" : "text-muted hover:text-snow"
      }`}
    >
      {label}
      {tab === id && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-bingo" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-white/[0.08]">
        {renderTab("upload", "Upload Diário")}
        {renderTab("criativos", "Cadastro de Criativos")}
        {renderTab("drive", "Importar do Drive")}
      </div>

      {tab === "upload" && <UploadForm experts={experts} />}
      {tab === "criativos" && <CriativoForm experts={criativoExperts} />}
      {tab === "drive" && <DriveImportForm experts={criativoExperts} />}
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
