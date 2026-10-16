"use client";
/**
 * Entrada discreta, uma vez.
 *
 * REGRA: o conteudo nasce VISIVEL. A animacao so acontece se o JS carregar
 * e o observador disparar. Esconder texto com opacity:0 esperando JS custa
 * caro — rastreador de busca, conexao ruim e observador que falha deixam a
 * pagina em branco, que foi exatamente o defeito que esta versao corrige.
 */
import { motion, useReducedMotion } from "motion/react";

export function Entrada({ children, atraso = 0, className }:
  { children: React.ReactNode; atraso?: number; className?: string }) {
  const reduz = useReducedMotion();
  if (reduz) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0.001, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.65, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
