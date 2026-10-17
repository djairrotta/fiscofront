"use client";
import { useRouter } from "next/navigation";

export function Sair() {
  const router = useRouter();
  return (
    <button type="button"
      onClick={async () => {
        await fetch("/api/sessao", { method: "DELETE" });
        router.replace("/"); router.refresh();
      }}
      className="w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-sm text-aco transition-colors hover:bg-acento-fundo hover:text-tinta">
      Sair
    </button>
  );
}
