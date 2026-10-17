import type { Metadata } from "next";
import { RegistraSW } from "@/componentes/RegistraSW";
import { Provedores } from "@/componentes/app/Provedores";
import { NavLateral, NavInferior } from "@/componentes/app/NavApp";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · fisco" },
  robots: { index: false, follow: false },   // painel nunca indexa
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "fisco" },
};

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Provedores>
      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        <RegistraSW />
        <NavLateral />
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
        <NavInferior />
      </div>
    </Provedores>
  );
}
