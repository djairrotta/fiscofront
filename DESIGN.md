# Sistema de design — fisco

## Leitura de design
Landing de captação para advogado tributarista (confiança, decisão racional)
somada a um painel denso de dados. **Duas superfícies, dois regimes** — a landing
persuade, o painel opera. A mesma paleta, dials diferentes.

| Superfície | Variância | Motion | Densidade |
|---|---|---|---|
| Landing `(publico)` | 7 | 6 | 4 |
| Painel `(app)` | 4 | 3 | 8 |

## Paleta — uma cor de destaque, e ela significa algo

Petróleo profundo. Escolhido por eliminação, não por gosto: o EmpresAqui é azul
marinho e o azul de SaaS está saturado nesta categoria. O petróleo lê como
precisão financeira sem virar "mais um painel azul", e por ser escuro e
dessaturado não briga com os selos semânticos de maturidade de tese.

```
--acento        #0F5B56   petróleo (único destaque, página inteira)
--acento-claro  #14807A
--tinta         #0B0F14   texto primário
--aco           #4A5863   texto secundário
--linha         #DFE4E8   bordas
--papel         #FFFFFF   cartão
--fundo         #F7F9FA   fundo
```

Escala semântica **separada** do destaque, reservada à maturidade da tese — por
isso o destaque não podia ser verde nem vermelho:

```
consolidada   emerald-50  / emerald-900
modulada      amber-50    / amber-900
em disputa    sky-50      / sky-900
derrotada     red-50      / red-900
```

Escuro: inverte `--fundo`/`--tinta`, mantém o destaque (não dessatura a marca).
Nunca `#000` nem `#fff` puros.

## Tipografia
**Geist** em tudo. Não é Inter (padrão de LLM) e não é serifada por capricho.
**Geist Mono** só em numeral tabular — valor de dívida, CNPJ, data. Monoespaçada
como "voz técnica" é fantasia; como numeral alinhado é função.

```
display  text-4xl md:text-6xl  tracking-tighter  leading-[1.05]
corpo    text-base  leading-relaxed  max-w-[65ch]
numeral  font-mono  tabular-nums
```

## Forma
Um raio só: **10px** em tudo que é superfície, **pill** só em controle
interativo. Sombra tingida do fundo, nunca preto puro sobre claro.

## Botão "líquido"
O brilho metálico pedido vem de gradiente sutil mais borda interna de 1px, não
de glow colorido. Vidro só onde há conteúdo atrás para desfocar. Abaixo de
`prefers-reduced-transparency`, sólido.

## Motion — um momento autoral
A landing tem **um** momento herói: o mapa do Brasil que se preenche com a
dívida real enquanto o visitante rola, e para na cidade dele. Tudo mais é
entrada discreta, uma vez, nunca em laço.

- entrada `cubic-bezier(0.16, 1, 0.3, 1)`, 0,7s
- saída `cubic-bezier(0.6, 0, 0.9, 0.35)`, metade da entrada
- stagger de cartão 0,06s
- `prefers-reduced-motion` entrega o estado final, sem perder hierarquia

GSAP + ScrollTrigger só onde há pin e scrub de verdade (o mapa). O resto é
entrada por IntersectionObserver.

## Proibido nesta página
Eyebrow acima do título; três cartões iguais com ícone; texto com gradiente;
emoji como ícone; número de seção 01/02/03; travessão em qualquer lugar;
screenshot falso feito de div; vidro como enfeite.
