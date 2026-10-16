export const metadata = { title: "Banco de teses" };

export default function Pagina() {
  return (
    <div className="p-5 md:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Banco de teses</h1>
      <div className="mt-5 rounded-[10px] border border-dashed border-linha p-10 text-center">
        <p className="text-sm font-medium">Em construção</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-aco">Fundamento, requisitos, checklist de documentos e selo de maturidade.</p>
      </div>
    </div>
  );
}
