/**
 * JSON-LD. Vale para busca tradicional e, cada vez mais, para resposta
 * gerada por IA: o motivo de existir aqui e declarar em dado estruturado
 * a mesma coisa que o texto diz, incluindo a FONTE e a DATA de cada
 * numero. Numero sem procedencia nao e citado por ninguem.
 */
export function DadosEstruturados({ json }: { json: Record<string, unknown> }) {
  return (
    <script type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />
  );
}

const BASE = process.env.SITE_URL ?? "https://fisco.judinfo.com.br";

export const organizacao = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "fisco",
  url: BASE,
  parentOrganization: { "@type": "Organization", name: "judinfo", url: "https://judinfo.com.br" },
  areaServed: { "@type": "Country", name: "Brasil" },
};

export const aplicativo = (preco: string) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "fisco",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: BASE,
  description:
    "Prospecção tributária sobre a dívida ativa da PGFN cruzada com o cadastro de CNPJ da Receita Federal, por município e por tese.",
  offers: { "@type": "Offer", price: preco, priceCurrency: "BRL",
            category: "subscription", url: `${BASE}/#planos` },
  isAccessibleForFree: false,
});

export const perguntas = (qa: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: qa.map((x) => ({
    "@type": "Question", name: x.q,
    acceptedAnswer: { "@type": "Answer", text: x.a },
  })),
});

/** Trilha de navegacao: a pagina de cidade precisa dizer onde ela mora. */
export const trilha = (itens: { nome: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: itens.map((i, n) => ({
    "@type": "ListItem", position: n + 1, name: i.nome, item: `${BASE}${i.url}`,
  })),
});

/**
 * Dataset na pagina de cidade. E o tipo certo: a pagina nao vende nada,
 * ela publica um recorte de base publica. Declarar isSmartBasedOn e
 * temporalCoverage e o que separa dado citavel de numero solto.
 */
export const conjuntoDados = (p: {
  nome: string; descricao: string; url: string; dataRef?: string | null;
}) => ({
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: p.nome,
  description: p.descricao,
  url: `${BASE}${p.url}`,
  license: "https://creativecommons.org/licenses/by/4.0/",
  isBasedOn: [
    { "@type": "Dataset", name: "Dados Abertos da Dívida Ativa da União",
      url: "https://dadosabertos.pgfn.gov.br/",
      creator: { "@type": "GovernmentOrganization", name: "Procuradoria-Geral da Fazenda Nacional" } },
    { "@type": "Dataset", name: "Cadastro Nacional da Pessoa Jurídica",
      creator: { "@type": "GovernmentOrganization", name: "Receita Federal do Brasil" } },
  ],
  ...(p.dataRef ? { temporalCoverage: String(p.dataRef).slice(0, 10) } : {}),
});
