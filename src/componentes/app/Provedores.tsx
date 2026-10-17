"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Provedores({ children }: { children: React.ReactNode }) {
  const [cliente] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        // 503 "preparando" tem que voltar sozinho quando a base ficar pronta.
        retry: (n, e: any) => e?.status === 503 ? n < 30 : n < 1,
        retryDelay: (n) => Math.min(20_000, 2000 * (n + 1)),
      },
    },
  }));
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
