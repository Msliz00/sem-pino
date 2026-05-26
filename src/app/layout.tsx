import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel Experts",
  description: "Painel administrativo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
