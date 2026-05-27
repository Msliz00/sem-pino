"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ExpertSlug = string;

export type ExpertOption = {
  slug: string;
  nome: string;
};

type ContextValue = {
  expertSelecionado: ExpertSlug;
  setExpertSelecionado: (s: ExpertSlug) => void;
  experts: ExpertOption[];
  loading: boolean;
  refetchExperts: () => Promise<void>;
};

const ExpertFilterContext = createContext<ContextValue | null>(null);

export function ExpertFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expertSelecionado, setExpertSelecionado] =
    useState<ExpertSlug>("todos");
  const [experts, setExperts] = useState<ExpertOption[]>([]);
  const [loading, setLoading] = useState(true);

  const refetchExperts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/experts");
      const d = await res.json();
      if (res.ok) {
        const list = (d.data ?? []) as {
          slug: string;
          nome: string;
          ordem: number;
        }[];
        list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        setExperts(list.map((e) => ({ slug: e.slug, nome: e.nome })));
      }
    } catch {
      // silencioso — pills ficam vazias mas app continua
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchExperts();
  }, [refetchExperts]);

  return (
    <ExpertFilterContext.Provider
      value={{
        expertSelecionado,
        setExpertSelecionado,
        experts,
        loading,
        refetchExperts,
      }}
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
