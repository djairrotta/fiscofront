const API = process.env.API_URL ?? "http://localhost:3000/api";

export interface Uf {
  uf: string; municipios: number; empresas_ativas: number;
  empresas_com_divida: number; divida_total: number; data_referencia: string;
}
export interface Municipio {
  municipio_ibge: string; municipio: string; empresas_ativas: number;
  empresas_com_divida: number; divida_total: number; divida_mediana: number;
  data_referencia: string;
  tributos?: { tributo: string; empresas: number; valor: number }[];
}

/**
 * API fora no momento do build NAO derruba o build: sem isto, um backend
 * reiniciando trava o deploy da landing inteira. Degrada para vazio e o
 * ISR preenche na primeira visita que encontrar a API no ar.
 */
async function buscar<T>(rota: string, vazio: T): Promise<T> {
  try {
    const r = await fetch(`${API}${rota}`, { next: { revalidate: 86400 } });
    return r.ok ? ((await r.json()) as T) : vazio;
  } catch {
    return vazio;
  }
}

export const listarUfs = () => buscar<Uf[]>("/ufs", []);
export const listarMunicipios = (uf: string) => buscar<Municipio[]>(`/ufs/${uf}/municipios`, []);
export const buscarMunicipio = (uf: string, ibge: string) =>
  buscar<Municipio | null>(`/ufs/${uf}/municipios/${ibge}`, null);
