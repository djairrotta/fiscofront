import Link from "next/link";
import { listarUfs } from "@/lib/dados";
import { brl, num, posicao } from "@/lib/formato";
import { MapaBrasil } from "@/componentes/MapaBrasil";
import { Entrada } from "@/componentes/Entrada";
import { Botao } from "@/componentes/Botao";
import { SeloTese } from "@/componentes/SeloTese";

export const revalidate = 86400;

export default async function Home() {
  const ufs = await listarUfs();
  const empresas = ufs.reduce((s, u) => s + Number(u.empresas_ativas || 0), 0);
  const devedoras = ufs.reduce((s, u) => s + Number(u.empresas_com_divida || 0), 0);
  const divida = ufs.reduce((s, u) => s + Number(u.divida_total || 0), 0);
  const ref = ufs[0]?.data_referencia ?? null;

  return (
    <main>
      {/* HERO — split assimetrico. O visual e o dado, nao foto de banco de imagem. */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-16 md:pt-24">
        <div>
          <h1 className="text-4xl font-semibold tracking-tighter leading-[1.05] md:text-[3.4rem]">
            Saiba quem deve.{" "}
            <span className="text-acento">Antes de ligar.</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-aco">
            Dívida inscrita por CNPJ, vinda da PGFN. Não é estimativa sobre faturamento
            presumido, é o valor que consta na inscrição.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Botao href="/empresas-devedoras">Ver a minha cidade</Botao>
            <Botao href="/#planos" variante="fantasma">Planos a partir de R$ 49</Botao>
          </div>
        </div>
        <div className="md:justify-self-end">
          <MapaBrasil ufs={ufs} />
        </div>
      </section>

      {/* Numeros reais, nao metrica gigante decorativa. Sem base carregada a
          banda inteira sai: zero em toda celula parece sistema quebrado. */}
      {divida > 0 ? (
        <section className="border-y border-linha bg-papel">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-linha md:grid-cols-4">
            {[
              { r: "Estabelecimentos ativos", v: num(empresas) },
              { r: "Com dívida inscrita", v: num(devedoras) },
              { r: "Total inscrito", v: brl(divida, true) },
              { r: "Municípios mapeados", v: num(ufs.reduce((s, u) => s + Number(u.municipios || 0), 0)) },
            ].map((x) => (
              <div key={x.r} className="bg-papel px-6 py-8">
                <p className="text-sm text-aco">{x.r}</p>
                <p className="mt-1.5 font-mono text-2xl font-semibold tabular">{x.v}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto max-w-6xl px-6 py-3 text-xs text-aco">
            {posicao(ref)}. Toda cifra deste site carrega a data de referência da base de origem.
          </p>
        </section>
      ) : (
        <section className="border-y border-linha bg-papel">
          <p className="mx-auto max-w-6xl px-6 py-5 text-sm text-aco">
            Os números por estado e município aparecem aqui assim que a primeira carga
            da base da PGFN entrar.
          </p>
        </section>
      )}

      {/* O QUE MUDA — lista de contraste, nao tres cartoes iguais com icone. */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Entrada>
          <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight md:text-4xl">
            O problema nunca foi achar empresa.
          </h2>
          <p className="mt-4 max-w-[62ch] text-lg text-aco">
            É saber qual delas tem um crédito que sobrevive à primeira leitura do seu parecer.
          </p>
        </Entrada>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[10px] border border-linha bg-linha md:grid-cols-2">
          <div className="bg-papel p-8">
            <p className="text-sm font-medium text-aco">Lista genérica de prospecção</p>
            <ul className="mt-5 space-y-3.5 text-[15px]">
              {[
                "Estimativa calculada sobre faturamento presumido por porte",
                "Nenhuma informação sobre processo em curso",
                "A tese continua na lista mesmo depois de perdida no STJ",
                "Você descobre o problema na reunião com o cliente",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-aco">
                  <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-linha" />{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-papel p-8">
            <p className="text-sm font-medium text-acento">fisco</p>
            <ul className="mt-5 space-y-3.5 text-[15px]">
              {[
                "Valor real da inscrição em dívida ativa, com tributo e data",
                "Processos da empresa pelo DJEN, com andamento do DataJud",
                "Maturidade de cada tese reconsultada toda semana",
                "O caso que exige sua análise chega sinalizado, não escondido",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-acento" />{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FLUXO — passos numerados, sem eyebrow 01/02/03 decorativo. */}
      <section className="border-y border-linha bg-papel">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Entrada>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Da tese à petição, no mesmo lugar
            </h2>
          </Entrada>
          <ol className="mt-14 grid gap-10 md:grid-cols-4">
            {[
              { t: "Escolha a tese", d: "Cada uma traz fundamento, requisitos e o selo de maturidade jurisprudencial." },
              { t: "Filtre a região", d: "Estado, município, CNAE, porte, regime e faixa de dívida." },
              { t: "Abra a ficha", d: "Dívida por inscrição, protestos, processos e as teses que se aplicam àquele CNPJ." },
              { t: "Gere a inicial", d: "Modelo validado, com os campos do caso preenchidos. No seu timbrado." },
            ].map((p, i) => (
              <Entrada key={p.t} atraso={i * 0.06}>
                <li>
                  <p className="font-mono text-sm text-acento tabular">{i + 1}</p>
                  <p className="mt-3 font-semibold">{p.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-aco">{p.d}</p>
                </li>
              </Entrada>
            ))}
          </ol>
        </div>
      </section>

      {/* TESES — o selo e o argumento. */}
      <section id="teses" className="mx-auto max-w-6xl px-6 py-24">
        <Entrada>
          <h2 className="max-w-[24ch] text-3xl font-semibold tracking-tight md:text-4xl">
            A tese que caiu no STJ sai do mapa sozinha
          </h2>
          <p className="mt-4 max-w-[62ch] text-lg text-aco">
            Cada tese guarda os temas e processos que a sustentam. Um serviço reconsulta
            esses identificadores toda semana no nosso buscador de jurisprudência. Mudou o
            julgamento, muda o selo e a tese deixa de aparecer na prospecção.
          </p>
        </Entrada>
        <div className="mt-12 flex flex-wrap gap-2.5">
          <SeloTese maturidade="consolidada_favoravel" />
          <SeloTese maturidade="modulada" />
          <SeloTese maturidade="em_disputa" />
          <SeloTese maturidade="derrotada" />
        </div>
        <p className="mt-6 max-w-[62ch] text-sm text-aco">
          Vender lista de lead para uma tese já perdida expõe o advogado que a usa. É o
          tipo de coisa que só aparece quando o cliente pergunta, e aí já é tarde.
        </p>
      </section>

      {/* PLANOS */}
      <section id="planos" className="border-t border-linha bg-papel">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Entrada>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Planos</h2>
          </Entrada>
          <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
            <Entrada>
              <div className="h-full rounded-[10px] border border-linha p-8">
                <p className="font-semibold">Documentação</p>
                <p className="mt-3">
                  <span className="font-mono text-4xl font-semibold tabular">R$ 49</span>
                  <span className="text-aco"> por mês</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-[15px] text-aco">
                  <li>Mapa e fichas de empresa do Brasil inteiro</li>
                  <li>Banco de teses com selo de maturidade</li>
                  <li>Processos pelo DJEN e andamento pelo DataJud</li>
                  <li>Exportação das listas</li>
                </ul>
                <div className="mt-8"><Botao href="/app" variante="fantasma">Assinar</Botao></div>
              </div>
            </Entrada>
            <Entrada atraso={0.08}>
              <div className="h-full rounded-[10px] border-2 border-acento p-8">
                <p className="font-semibold text-acento">Com inteligência artificial</p>
                <p className="mt-3">
                  <span className="font-mono text-4xl font-semibold tabular">em breve</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-[15px] text-aco">
                  <li>Tudo do plano Documentação</li>
                  <li>Petição inicial gerada, de 5 a 30 por mês</li>
                  <li>Modelo validado com os campos do caso preenchidos</li>
                  <li>Cálculo do indébito e parecer assinado por perito</li>
                </ul>
                <div className="mt-8"><Botao href="/#planos">Entrar na lista</Botao></div>
              </div>
            </Entrada>
          </div>
          <p className="mt-8 text-sm text-aco">
            Sete dias para desistir, com reembolso total. Pagamento por PIX ou cartão.
          </p>
        </div>
      </section>

      {/* ESTADOS — ponte para as 5.570 paginas de SEO */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Entrada>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Comece pelo seu estado
          </h2>
          <p className="mt-4 max-w-[62ch] text-lg text-aco">
            Os números por município são públicos e abertos. O CNPJ de cada empresa fica no painel.
          </p>
        </Entrada>
        <ul className="mt-12 grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-4">
          {ufs.map((u) => (
            <li key={u.uf}>
              <Link href={`/empresas-devedoras/${u.uf.toLowerCase()}`}
                    className="group flex items-baseline justify-between border-b border-linha py-3 text-sm">
                <span className="font-medium group-hover:text-acento">{u.uf}</span>
                <span className="font-mono text-aco tabular">{brl(u.divida_total, true)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
