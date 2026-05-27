"use client";

import { useState, useEffect } from "react";

type Props = {
  open: boolean;
  expertNome: string;
  dataReferencia: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function formatDateBR(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function ConflictDialog({
  open,
  expertNome,
  dataReferencia,
  onCancel,
  onConfirm,
}: Props) {
  const [step, setStep] = useState<"warn" | "confirm">("warn");

  useEffect(() => {
    if (open) setStep("warn");
  }, [open]);

  if (!open) return null;

  const handleCancelAll = () => {
    setStep("warn");
    onCancel();
  };

  const handleConfirm = () => {
    setStep("warn");
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/[0.08] bg-surface p-6 shadow-2xl">
        {step === "warn" ? (
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-snow">
                Upload já existe
              </h2>
              <p className="text-sm text-muted">
                Já existe um upload pra{" "}
                <span className="text-snow">{expertNome}</span> no dia{" "}
                <span className="text-snow">
                  {formatDateBR(dataReferencia)}
                </span>
                . O que deseja fazer?
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelAll}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-snow transition-colors hover:bg-danger/90"
              >
                Substituir
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-snow">
                Confirmar substituição
              </h2>
              <p className="text-sm text-muted">
                Tem certeza que deseja substituir os dados atuais? Esta ação
                não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelAll}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-snow"
              >
                Não
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-snow transition-colors hover:bg-danger/90"
              >
                Sim, substituir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
