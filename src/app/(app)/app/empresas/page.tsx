import { redirect } from "next/navigation";
// A lista de empresas virou a Pesquisa; links antigos continuam valendo.
export default function Pagina() { redirect("/app/pesquisa"); }
