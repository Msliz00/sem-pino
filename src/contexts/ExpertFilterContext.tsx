"use client";

import { createContext, useContext, useState } from "react";

export type ExpertSlug = string;

export type ExpertOption = {
  slug: string;
  nome: string;
};

type ContextValue = {
  expertSelecionado: ExpertSlug;
  setExpertSelecionado: (s: ExpertSlug) => void;
  experts: ExpertOption[];
};

const ExpertFilterContext = createContext<ContextValue | null>(null);

export function ExpertFilterProvider({
  children,
  experts,
}: {
  children: React.ReactNode;
  experts: ExpertOption[];
}) {
  const [expertSelecionado, setExpertSelecionado] =
    useState<ExpertSlug>("todos");

  return (
    <ExpertFilterContext.Provider
      value={{ expertSelecionado, setExpertSelecionado, experts }}
    >
      {children}
    </ExpertFilterContext.Provider>
  );
}

export function useExpertFilter(): ContextValue {
  const ctx = useContext(ExpertFilterContext);
  if (!ctx) {
    throw new Error(
      "useExpertFilter precisa estar dentro de <ExpertFilterProvider>",
    );
  }
  return ctx;
}
