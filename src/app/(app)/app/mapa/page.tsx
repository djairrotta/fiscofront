export const metadata = { title: "Mapa de oportunidades" };

export default function Pagina() {
  return (
    <div className="p-5 md:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Mapa de oportunidades</h1>
      <div className="mt-5 rounded-[10px] border border-dashed border-linha p-10 text-center">
        <p className="text-sm font-medium">Em construção</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-aco">Filtro por tese, estado, município, CNAE, porte, regime e faixa de dívida.</p>
      </div>
    </div>
  );
}
