"use client";

import { useExpertFilter } from "@/contexts/ExpertFilterContext";

type Props = {
  title: string;
  accent: string;
  subtitle: string;
  /** Se true, o acessório é trocado pelo nome do expert selecionado (exceto "todos") */
  dynamicAccent?: boolean;
};

export function PageHeader({
  title,
  accent,
  subtitle,
  dynamicAccent = false,
}: Props) {
  const { expertSelecionado, setExpertSelecionado, experts, loading } =
    useExpertFilter();

  let displayAccent = accent;
  if (dynamicAccent && expertSelecionado !== "todos") {
    const exp = experts.find((e) => e.slug === expertSelecionado);
    if (exp) displayAccent = exp.nome;
  }

  const pills = [{ slug: "todos", nome: "Todos" }, ...experts];

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
      <div>
        <h1 className="page-title">
          {title}
          <span className="serif-accent ml-3" style={{ fontSize: 36 }}>
            {displayAccent}
          </span>
        </h1>
        <p className="page-sub">{subtitle}</p>
      </div>

      <div className="experts-pills">
        {pills.map(({ slug, nome }) => {
          const active = expertSelecionado === slug;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => setExpertSelecionado(slug)}
              className={`expert-pill ${active ? "active" : ""}`}
            >
              <span className="dot" />
              <span>{nome}</span>
            </button>
          );
        })}
        {loading && experts.length === 0 && (
          <span className="expert-pill" style={{ opacity: 0.5 }}>
            <span className="dot" />
            <span>carregando...</span>
          </span>
        )}
      </div>
    </div>
  );
}
