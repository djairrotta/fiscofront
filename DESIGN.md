# Sistema de design — fisco

## Leitura de design
Landing de captação para advogado tributarista (confiança, decisão racional)
somada a um painel denso de dados. **Duas superfícies, dois regimes** — a landing
persuade, o painel opera. A mesma paleta, dials diferentes.

| Superfície | Variância | Motion | Densidade |
|---|---|---|---|
| Landing `(publico)` | 9 | 9 | 4 |
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

## Motion — um palco, e só um
A landing tem **um** momento autoral, agora maior: um palco de 560vh em que o
Brasil aparece em relevo e conduz quatro capítulos ligados ao argumento de
venda (a base existe, a tese escolhe, a região, a peça). Fora do palco, tudo é
entrada discreta, uma vez, nunca em laço.

**Não é WebGL ao vivo.** São 72 quadros pré-renderizados em Three.js headless
(o fonte da cena fica fora do repositório, em `scratchpad/cena/scene.html`)
desenhados num `<canvas>`. Motivo: roda igual em celular fraco, não põe runtime
3D no bundle e não depende de GPU. Custa 4,4 MB no desktop e 2,3 MB no celular,
carregados por streaming conforme a rolagem; o primeiro quadro tem 83 KB.

Regras do palco, todas já violadas uma vez e corrigidas:
- o objeto **nunca** fica sob o texto: no herói ele desce e encolhe, depois
  alterna de lado a cada capítulo, sempre oposto ao texto;
- o herói **sai de cena** antes do primeiro capítulo entrar, senão manchete e
  capítulo disputam a mesma tela;
- `prefers-reduced-motion` entrega o último quadro e os capítulos como lista,
  sem pin e sem canvas.

Sem Lenis de propósito: ele sequestra o scroll global e vazaria para o painel.

- entrada `cubic-bezier(0.16, 1, 0.3, 1)`, 0,7s
- saída `cubic-bezier(0.6, 0, 0.9, 0.35)`, metade da entrada
- stagger de cartão 0,06s
- `prefers-reduced-motion` entrega o estado final, sem perder hierarquia

GSAP + ScrollTrigger só onde há pin e scrub de verdade (o palco e o mapa). O
resto é entrada por `whileInView`, com o conteúdo nascendo visível.

## Armadilha de build que já custou tempo
`output: "standalone"` no `next.config.ts` faz `next start` servir hashes de
chunk que não existem no disco (400/404 em tudo). Para verificar o build
localmente, rodar o `server.js` do standalone, copiando antes `.next/static` e
`public` para dentro dele. No Docker isso não aparece porque a raiz de trace é
o próprio `/app`.

## Proibido nesta página
Eyebrow acima do título; três cartões iguais com ícone; texto com gradiente;
emoji como ícone; número de seção 01/02/03; travessão em qualquer lugar;
screenshot falso feito de div; vidro como enfeite.
