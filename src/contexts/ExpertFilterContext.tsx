"use client";

import { createContext, useContext, useState } from "react";

export type ExpertSlug = "todos" | "professor" | "iris-aviator";

type ContextValue = {
  expertSelecionado: ExpertSlug;
  setExpertSelecionado: (s: ExpertSlug) => void;
};

const ExpertFilterContext = createContext<ContextValue | null>(null);

export function ExpertFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expertSelecionado, setExpertSelecionado] =
    useState<ExpertSlug>("todos");

  return (
    <ExpertFilterContext.Provider
      value={{ expertSelecionado, setExpertSelecionado }}
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
