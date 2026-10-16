import Link from "next/link";

type Props = { href: string; children: React.ReactNode; variante?: "primario" | "fantasma" };

export function Botao({ href, children, variante = "primario" }: Props) {
  const base =
    "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full px-6 " +
    "text-sm font-semibold cursor-pointer transition-colors";
  if (variante === "fantasma") {
    return (
      <Link href={href}
        className={`${base} border border-linha bg-papel text-tinta hover:bg-acento-fundo`}>
        {children}
      </Link>
    );
  }
  return (
    <Link href={href} className={`${base} botao-liquido text-white`}>{children}</Link>
  );
}
