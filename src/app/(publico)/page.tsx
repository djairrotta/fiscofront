import Link from "next/link";
import { listarUfs } from "@/lib/dados";
import { brl, num, posicao } from "@/lib/formato";
import { MapaBrasil } from "@/componentes/MapaBrasil";
import { CenaScroll } from "@/componentes/CenaScroll";
import { Entrada } from "@/componentes/Entrada";
import { Botao } from "@/componentes/Botao";
import { SeloTese } from "@/componentes/SeloTese";
import { DadosEstruturados, organizacao, aplicativo, perguntas } from "@/componentes/DadosEstruturados";

export const revalidate = 3600;

const CAPITULOS = [
  { titulo: "A base inteira, não só as devedoras",
    texto: "A Receita publica o cadastro de todas as empresas do Brasil e a PGFN publica a dívida inscrita a cada trimestre. Juntamos as duas: cada empresa aparece com a dívida federal dela ao lado." },
  { titulo: "O filtro é o seu mercado",
    texto: "Atividade, cidade, raio em quilômetros, bairro, porte, capital, sócios, regime. Recém-abertas, excluídas do Simples, MEI desenquadrados. Você chega na lista que interessa antes de falar com alguém." },
  { titulo: "O momento da dívida",
    texto: "A série histórica da PGFN desde 2020 mostra quem teve inscrição nova no trimestre, quem teve o parcelamento rescindido e de quem a dívida está crescendo. É quando a empresa precisa de ajuda." },
  { titulo: "Do contato à conversa",
    texto: "E-mail, telefone e celular de cada empresa, com o contato do contador dela marcado. Campanha de e-mail e WhatsApp com descadastro automático, funil e lembretes no mesmo lugar." },
];

const TESES = [
  { nome: "Exclusão do ICMS da base do PIS e da COFINS", tributo: "PIS/COFINS",
    maturidade: "modulada" as const, nota: "RE 574.706, modulação a partir de 15/03/2017" },
  { nome: "ICMS sobre TUST e TUSD na conta de energia", tributo: "ICMS",
    maturidade: "em_disputa" as const, nota: "Tema 986 do STJ, com Lei 14.385/2022 no caminho" },
  { nome: "Contribuição ao Sistema S sobre o limite de 20 salários mínimos", tributo: "Terceiros",
    maturidade: "derrotada" as const, nota: "Tema 1.079 do STJ. Entra na base para ser marcada, não para ser vendida" },
  { nome: "Gorjetas fora da base do Simples Nacional", tributo: "Simples",
    maturidade: "consolidada_favoravel" as const, nota: "Natureza salarial reconhecida, repasse integral ao empregado" },
  { nome: "PIS e COFINS na Zona Franca de Manaus", tributo: "PIS/COFINS",
    maturidade: "em_disputa" as const, nota: "Tema 1.239 do STJ" },
  { nome: "JCP de exercícios anteriores deliberado em assembleia", tributo: "IRPJ/CSLL",
    maturidade: "em_disputa" as const, nota: "Tema 1.319 do STJ" },
];

const DUVIDAS = [
  { q: "Para quem é o fisco?",
    a: "Para escritórios de contabilidade, consultorias e gestores de empresas. Quem procura clientes novos usa a pesquisa e as campanhas. Quem já tem carteira importa a lista de CNPJs e acompanha a dívida federal de cada cliente." },
  { q: "Isso substitui a minha análise?",
    a: "Não. O sistema mostra o que está nos dados públicos: cadastro, regime, dívida inscrita e como ela mudou. Dizer o que fazer com aquela empresa, com a escrituração e os documentos dela, continua sendo trabalho seu." },
  { q: "De onde vem o valor da dívida?",
    a: "Da base de Dados Abertos da própria PGFN, nas três frentes que ela publica: dívida geral, previdenciária e FGTS. Somamos apenas o devedor principal, porque o corresponsável aparece repetido e dobraria o valor. Toda cifra na tela vem com a data de referência da base." },
  { q: "Por que o município não vem da PGFN?",
    a: "Porque a PGFN não publica município, só a unidade federativa e a unidade de inscrição. A cidade vem do cadastro de CNPJ da Receita Federal, cruzado pela raiz do CNPJ. É por isso que conseguimos descer ao município sem inventar dado." },
  { q: "Posso usar esses dados para prospectar? E a LGPD?",
    a: "Os dados são públicos e de pessoa jurídica: cadastro da Receita e dívida ativa da PGFN. O contato comercial entre empresas se apoia no legítimo interesse, desde que o destinatário possa sair. Por isso todo e-mail leva o link de descadastro, todo WhatsApp leva a opção de responder SAIR, e quem saiu nunca mais recebe do seu escritório. As campanhas têm limite diário e horário de envio." },
  { q: "O telefone que aparece não é do contador da empresa?",
    a: "Às vezes é. Quando o mesmo e-mail ou telefone aparece em cinco empresas ou mais, ou o e-mail tem cara de escritório contábil, marcamos como provável contato do contador. Na pesquisa, na exportação e nas campanhas dá para deixar esses contatos de fora." },
  { q: "E se eu quiser cancelar?",
    a: "A assinatura é mensal e o cancelamento é feito por você, sem contato comercial. O acesso vale até o fim do período já pago." },
];

export default async function Home() {
  const ufs = await listarUfs();
  const divida = ufs.reduce((s, u) => s + (Number(u.divida_total) || 0), 0);
  const empresas = ufs.reduce((s, u) => s + (Number(u.empresas_com_divida) || 0), 0);
  const ref = ufs[0]?.data_referencia;

  return (
    <main>
      <DadosEstruturados json={organizacao} />
      <DadosEstruturados json={aplicativo("49.00")} />
      <DadosEstruturados json={perguntas(DUVIDAS.map((d) => ({ q: d.q, a: d.a })))} />
      {/* 1. Palco 3D: o Brasil em relevo conduz os quatro capítulos. */}
      <CenaScroll capitulos={CAPITULOS}>
        <div className="pointer-events-auto max-w-2xl pt-20 md:pt-24">
          <h1 className="text-4xl font-semibold tracking-tighter leading-[1.05] md:text-6xl">
            Todas as empresas do Brasil.
            <br className="hidden md:inline" />{" "}
            Com a dívida federal de cada uma.
          </h1>
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-aco md:text-lg">
            Pesquisa no cadastro completo da Receita, com a dívida ativa da PGFN e o
            momento dela. Para contadores e gestores acharem a empresa certa e falarem
            com ela.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Botao href="/empresas-devedoras">Ver a minha cidade</Botao>
            <Botao href="#consulta" variante="fantasma">Consultar um CNPJ</Botao>
          </div>
        </div>
      </CenaScroll>

      {/* 2. Comparação: o estado de hoje contra o estado com a ferramenta. */}
      <section className="relative z-10 -mt-[12vh] rounded-t-[28px] border-t border-linha bg-papel shadow-[0_-24px_48px_-32px_rgb(11_15_20/0.18)]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Entrada>
            <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tighter md:text-4xl">
              O difícil não é o serviço. É saber quem precisa dele agora.
            </h2>
          </Entrada>
          <div className="mt-12 grid gap-px overflow-hidden rounded-superficie border border-linha bg-linha md:grid-cols-2">
            <Entrada className="bg-fundo p-8 md:p-10">
              <p className="text-sm font-medium text-aco">Como costuma ser</p>
              <ul className="mt-5 space-y-4 text-[15px] leading-relaxed text-aco">
                <li>A lista de empresas vem comprada, velha e sem critério fiscal.</li>
                <li>Metade dos telefones é do contador que abriu a empresa.</li>
                <li>Você só sabe da dívida quando o cliente já está com o problema.</li>
                <li>Pesquisa numa ferramenta, e-mail em outra, follow-up na planilha.</li>
              </ul>
            </Entrada>
            <Entrada atraso={0.08} className="bg-papel p-8 md:p-10">
              <p className="text-sm font-medium text-acento">Como fica aqui</p>
              <ul className="mt-5 space-y-4 text-[15px] leading-relaxed">
                <li>A base é a da Receita, atualizada todo mês, com todas as empresas.</li>
                <li>O contato do contador vem marcado e pode ficar de fora.</li>
                <li>Inscrição nova, acordo rescindido e dívida crescendo aparecem como sinal.</li>
                <li>Pesquisa, gráficos, exportação, campanha e funil no mesmo lugar.</li>
              </ul>
            </Entrada>
          </div>
        </div>
      </section>

      {/* 3. Mapa real, com o dado que existir no banco. */}
      <section id="mapa" className="border-t border-linha bg-fundo">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Entrada>
            <h2 className="max-w-[22ch] text-3xl font-semibold tracking-tighter md:text-4xl">
              Dívida inscrita por estado, com a data da base ao lado
            </h2>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-aco">
              O volume de cada bloco é o valor inscrito, somado apenas no devedor
              principal. Clique no estado para descer ao município.
            </p>
          </Entrada>

          {divida > 0 && (
            <Entrada atraso={0.06} className="mt-10 grid gap-px overflow-hidden rounded-superficie border border-linha bg-linha sm:grid-cols-3">
              {[
                { r: "Dívida inscrita", v: brl(divida, true) },
                { r: "Empresas com inscrição", v: num(empresas) },
                { r: "Posição da base", v: posicao(ref) || "a carregar" },
              ].map((c) => (
                <div key={c.r} className="bg-papel p-6">
                  <p className="text-sm text-aco">{c.r}</p>
                  <p className="mt-1 font-mono text-2xl tracking-tight tabular">{c.v}</p>
                </div>
              ))}
            </Entrada>
          )}

          <div className="mt-12">
            <MapaBrasil ufs={ufs} />
          </div>
        </div>
      </section>

      {/* 4. Bento: cada célula com peso e fundo próprios. */}
      <section id="recursos" className="border-t border-linha bg-papel">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Entrada>
            <h2 className="max-w-[24ch] text-3xl font-semibold tracking-tighter md:text-4xl">
              Da pesquisa ao primeiro contato, sem trocar de ferramenta
            </h2>
          </Entrada>
          <div className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-2">
            <Entrada className="md:col-span-2 md:row-span-2">
              <article className="flex h-full flex-col justify-between overflow-hidden rounded-superficie border border-linha bg-fundo">
                <div className="p-8 md:p-10">
                  <h3 className="text-xl font-semibold tracking-tight">Pesquisa e gráficos</h3>
                  <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-aco">
                    Filtre por atividade, cidade, raio, bairro, regime, porte, capital,
                    sócios e dívida, ou descreva em português o que procura e a IA monta
                    os filtros. Cada pesquisa vira gráficos (onde estão, o que fazem,
                    quando abriram) e sai em planilha de até 100 mil empresas.
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cena/d/f_050.webp" alt="" aria-hidden="true"
                  className="mt-4 w-full max-w-md self-end opacity-90" />
              </article>
            </Entrada>
            <Entrada atraso={0.06}>
              <article className="h-full rounded-superficie bg-acento p-8 text-white">
                <h3 className="text-lg font-semibold tracking-tight">Campanhas</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/80">
                  E-mail e WhatsApp para as empresas da pesquisa, com limite diário,
                  horário de envio e descadastro automático.
                </p>
              </article>
            </Entrada>
            <Entrada atraso={0.12}>
              <article className="h-full rounded-superficie border border-linha bg-acento-fundo p-8">
                <h3 className="text-lg font-semibold tracking-tight">Funil e lembretes</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-aco">
                  Fases do seu jeito, próximo passo por empresa e um e-mail às 7h
                  com o que é para hoje e o que atrasou.
                </p>
              </article>
            </Entrada>
          </div>
        </div>
      </section>

      {/* 5. Teses: lista com selo, não cartão com ícone. */}
      <section id="teses" className="border-t border-linha bg-fundo">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Entrada>
            <h2 className="max-w-[24ch] text-3xl font-semibold tracking-tighter md:text-4xl">
              Recuperação de crédito: toda tese entra com a maturidade declarada
            </h2>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-aco">
              Para quem oferece revisão tributária aos clientes. Inclusive as derrotadas:
              elas ficam na base marcadas como derrotadas e não entram na conta.
              Oferecer tese vencida queima a relação com o cliente.
            </p>
          </Entrada>
          <ul className="mt-12 divide-y divide-linha border-y border-linha">
            {TESES.map((t, i) => (
              <Entrada key={t.nome} atraso={i * 0.04}>
                <li className="flex flex-col gap-3 py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                  <div className="max-w-[58ch]">
                    <p className="font-medium tracking-tight">{t.nome}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-aco">{t.nota}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs text-aco">{t.tributo}</span>
                    <SeloTese maturidade={t.maturidade} />
                  </div>
                </li>
              </Entrada>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Consulta avulsa: topo de funil sem cadastro. */}
      <section id="consulta" className="border-t border-linha bg-papel">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid gap-12 md:grid-cols-[1fr_auto] md:items-end">
            <Entrada>
              <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tighter md:text-4xl">
                Teste com um CNPJ que você já conhece
              </h2>
              <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-aco">
                Uma consulta por visitante, sem cadastro. Devolve a dívida inscrita e
                como ela está. Teste com um cliente seu: se o resultado não disser nada
                que você já não saiba, não assine.
              </p>
            </Entrada>
            <Entrada atraso={0.06}>
              <form action="/app/empresas" className="flex flex-col gap-2">
                <label htmlFor="cnpj" className="text-sm font-medium">CNPJ</label>
                <div className="flex flex-wrap gap-2">
                  <input id="cnpj" name="cnpj" inputMode="numeric" placeholder="00.000.000/0001-00"
                    className="h-11 w-56 rounded-full border border-linha bg-fundo px-5 font-mono text-sm text-tinta placeholder:text-aco/70" />
                  <button type="submit"
                    className="botao-liquido inline-flex h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-6 text-sm font-semibold text-white">
                    Consultar
                  </button>
                </div>
                <p className="text-xs text-aco">Não guardamos o CNPJ consultado sem cadastro.</p>
              </form>
            </Entrada>
          </div>
        </div>
      </section>

      {/* 7. Planos. */}
      <section id="planos" className="border-t border-linha bg-fundo">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Entrada>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Planos</h2>
          </Entrada>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <Entrada>
              <article className="flex h-full flex-col rounded-superficie border border-linha bg-papel p-8 md:p-10">
                <h3 className="text-lg font-semibold tracking-tight">Pesquisa</h3>
                <p className="mt-4 font-mono text-4xl tracking-tight tabular">
                  R$ 49<span className="text-base text-aco"> por mês</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-[15px] leading-relaxed text-aco">
                  <li>Pesquisa em todas as empresas do Brasil, com a dívida federal de cada uma</li>
                  <li>Momento da dívida: inscrição nova, acordo rescindido, dívida crescendo</li>
                  <li>Gráficos por pesquisa e exportação em planilha</li>
                  <li>Listas importadas para acompanhar a sua carteira</li>
                  <li>Funil, próximos passos e lembrete diário por e-mail</li>
                </ul>
                <div className="mt-8"><Botao href="/app">Assinar</Botao></div>
              </article>
            </Entrada>
            <Entrada atraso={0.08}>
              <article className="flex h-full flex-col rounded-superficie border border-acento bg-acento-fundo p-8 md:p-10">
                <h3 className="text-lg font-semibold tracking-tight">Com campanhas e IA</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-aco">
                  O preço sai quando o envio estiver validado com os primeiros escritórios.
                  Enquanto não estiver, não cobramos por ele.
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-[15px] leading-relaxed text-aco">
                  <li>Tudo do plano Pesquisa</li>
                  <li>Campanhas de e-mail e WhatsApp com descadastro automático</li>
                  <li>Pesquisa na internet: site, telefone e e-mail que a empresa publica</li>
                  <li>IA: pesquisa em português, objetivos e mensagem de primeiro contato</li>
                </ul>
                <div className="mt-8"><Botao href="/app" variante="fantasma">Entrar na lista</Botao></div>
              </article>
            </Entrada>
          </div>
        </div>
      </section>

      {/* 8. Dúvidas. */}
      <section id="duvidas" className="border-t border-linha bg-papel">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <Entrada>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Dúvidas</h2>
          </Entrada>
          <div className="mt-10 divide-y divide-linha border-y border-linha">
            {DUVIDAS.map((d, i) => (
              <Entrada key={d.q} atraso={i * 0.03}>
                <details className="group py-5">
                  <summary className="cursor-pointer list-none text-[15px] font-medium tracking-tight marker:content-none">
                    {d.q}
                  </summary>
                  <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-aco">{d.a}</p>
                </details>
              </Entrada>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Fechamento. */}
      <section className="border-t border-linha bg-acento">
        <div className="mx-auto max-w-6xl px-6 py-20 text-white md:py-24">
          <Entrada>
            <h2 className="max-w-[18ch] text-3xl font-semibold tracking-tighter md:text-4xl">
              Comece pela cidade onde você já atende
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-white/75">
              O mapa é público. Com a conta, você desce ao nome, ao contato e ao momento de cada empresa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-acento transition-transform hover:-translate-y-px">
                Assinar
              </Link>
              <Link href="/empresas-devedoras"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                Ver o mapa público
              </Link>
            </div>
          </Entrada>
        </div>
      </section>
    </main>
  );
}
