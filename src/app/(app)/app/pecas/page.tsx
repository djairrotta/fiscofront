export const metadata = { title: "Peças" };

/**
 * Pagina honesta: a geracao existe no backend, mas depende do plano com IA
 * e da chave do modelo configurada. Nao finge um botao que nao funciona.
 */
export default function Pagina() {
  return (
    <div className="mx-auto max-w-[900px] p-5 md:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Peças</h1>
      <div className="mt-5 rounded-[10px] border border-linha bg-papel p-6">
        <p className="font-medium">Geração de petição a partir da ficha da empresa</p>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-aco">
          A peça é montada sobre a tese escolhida e os dados da ficha (CNPJ, inscrições, tributo, valores),
          com campo vazio quando falta dado, em vez de inventar. Está disponível no plano com IA e é ativada
          quando a chave do modelo de linguagem é configurada no servidor.
        </p>
        <p className="mt-3 text-sm text-aco">Enquanto isso, use as <a href="/app/notas" className="text-acento underline dark:text-acento-claro">Notas</a> para rascunhos e o checklist de documentos de cada tese em <a href="/app/teses" className="text-acento underline dark:text-acento-claro">Teses</a>.</p>
      </div>
    </div>
  );
}
