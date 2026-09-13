# kittens

Gatinhos em pixel art que moram dentro de qualquer elemento da sua página. Eles andam,
correm, pulam nos seus cards, escalam paredes, brincam, dormem e se limpam — tudo sozinhos,
sem você programar um passo sequer.

<img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/kittens.gif" alt="Um gato calico anda, pula numa prateleira, corre e escala uma coluna enquanto outro cochila e um terceiro abana o rabo" width="408">

- **Sem dependências** e leve: ~18 kB gzip, um único `requestAnimationFrame` para todos.
- **Web Component** (`<kitten-pet>`) ou **classe** (`new Kitten(elemento)`).
- Eles leem o seu layout de verdade: pisam no topo dos seus cards e botões, escalam as
  laterais deles e voltam a se ajustar quando a página muda.
- Respeita `prefers-reduced-motion`.

![Pelagens: calico, laranja, cinza, preto e siamês](https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pelagens.png)

## Instalar

```bash
npm i kittens
```

## Usar

| Quero…                         | Faço assim                                                                 |
| ------------------------------ | -------------------------------------------------------------------------- |
| Um gato numa `div`             | `<kitten-pet></kitten-pet>` dentro dela (ou `new Kitten(div)`)              |
| Escolher a pelagem             | `<kitten-pet coat="laranja">`                                              |
| Um gato maior                  | `<kitten-pet scale="4">` (px por pixel da arte)                            |
| Chamar o gato com dois cliques | `<kitten-pet summon>`                                                      |
| Limitar onde ele pisa          | `<kitten-pet platforms=".card, img">`                                      |
| Pedir uma ação agora           | `gato.do('jump')`                                                          |
| Saber o que ele está fazendo   | `gato.state` ou o evento `statechange`                                     |
| Tirar o gato da página         | `gato.destroy()`                                                           |

### Web component

```html
<section class="area">
  <article class="card">seus elementos de sempre</article>
  <kitten-pet coat="calico" scale="3" name="Mingau" summon></kitten-pet>
</section>

<script type="module">
  import 'kittens'; // registra o <kitten-pet>
</script>
```

O gato vive no elemento **pai** da tag (ou no ancestral que você apontar com
`container="..."`). Ele não mexe no seu layout: desenha numa camada própria por cima.

### Classe

```ts
import { Kitten } from 'kittens';

const gato = new Kitten(document.querySelector('#area')!, {
  coat: 'laranja',
  scale: 3,
  summon: true,
});

gato.addEventListener('statechange', (e) => console.log(e.detail.state));
```

## Opções

| Opção         | Padrão     | O que faz                                                                 |
| ------------- | ---------- | ------------------------------------------------------------------------- |
| `coat`        | `'calico'` | `calico`, `laranja`, `cinza`, `preto`, `siames` ou uma paleta sua          |
| `scale`       | `3`        | Tamanho de cada pixel da arte, em px. Inteiros mantêm a arte nítida        |
| `speed`       | `1`        | Multiplicador da velocidade de andar e correr                             |
| `platforms`   | `'auto'`   | Onde ele pode pisar: `'auto'` ou um seletor CSS                           |
| `interactive` | `true`     | Clique (mia), carinho (mouse parado em cima) e arrastar (pega no colo)     |
| `summon`      | `false`    | Dois cliques no container chamam o gato até o ponto clicado               |
| `nudge`       | `true`     | Os elementos balançam de leve quando levam patada                         |
| `behaviors`   | —          | Peso de cada comportamento; `0` desliga (ex.: `{ nap: 2, climb: 0 }`)      |
| `phrases`     | `miau!`, … | Frases do balão de fala                                                   |
| `name`        | `'Kitten'` | Nome do gato (vai nos eventos)                                            |
| `seed`        | aleatória  | Mesma semente, mesmas escolhas — bom para testes                          |
| `x`           | aleatório  | Posição inicial no chão                                                   |

No web component, cada opção vira um atributo de mesmo nome
(`<kitten-pet coat="preto" scale="2" summon>`).

## Métodos e leituras

| Chamada             | O que faz                                                            |
| ------------------- | -------------------------------------------------------------------- |
| `do(acao)`          | Pede uma ação agora (veja a tabela abaixo)                           |
| `meow('oi!')`       | Mia com um balão de fala                                             |
| `summonTo(x, y)`    | Chama o gato para um ponto do container                              |
| `setCoat('preto')`  | Troca a pelagem sem recriar o gato                                   |
| `pause()`/`resume()`| Congela e retoma a animação                                          |
| `destroy()`         | Remove o gato e solta tudo                                           |
| `state`, `energy`   | O que ele faz agora e o quanto está disposto (0 a 1)                 |
| `position`          | `{ x, y }` no palco                                                  |

Ações aceitas por `do(...)`: `sit`, `walk`, `jump`, `climb`, `play`, `bat`, `groom`,
`stretch`, `loaf`, `sleep`, `meow`, `explore`, `wander`, `social`.

## Eventos

A instância é um `EventTarget` e a camada dispara os mesmos eventos com o prefixo
`kitten:` (eles borbulham, então dá para ouvir no container).

| Evento        | `detail`                                                        |
| ------------- | --------------------------------------------------------------- |
| `statechange` | `{ state, previous }`                                           |
| `meow`        | `{ text }`                                                      |
| `land`        | `{ element, height }` — em que elemento pousou (`null` = chão)   |
| `nudge`       | `{ element }` — a patada que ele deu                             |
| `summon`      | `{ x, y }` — foi chamado para um ponto                           |
| `social`      | `{ kind, other }` — o que aprontou com outro gato                |
| `click`, `pet`, `grab`, `drop`, `destroy` | —                                     |

Todos incluem `cat` (a instância).

## Poses

![Poses: sentado, deitado, dormindo, se limpando, correndo, espreguiçando, no colo e escalando](https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/poses.png)

A arte é uma grade de texto em [`src/sprites/frames.ts`](https://github.com/catmaitachi/kittens/blob/main/src/sprites/frames.ts) — 28 frames
desenhados lisos, sem mancha nenhuma. Quem dá a pelagem é a **máscara** de cada raça em
[`src/sprites/palette.ts`](https://github.com/catmaitachi/kittens/blob/main/src/sprites/palette.ts), que pinta pixel a pixel na hora de gerar
a spritesheet. Trocar de pelagem troca o padrão, não só as cores.

![Spritesheet do calico](https://raw.githubusercontent.com/catmaitachi/kittens/main/assets/kitten-calico@6x.png)

## Vários gatos

Gatos no mesmo container se enxergam: eles se cumprimentam, dão patadinha, brincam de
pega-pega e deitam lado a lado. É só criar mais de um.

## Desenvolvimento

| Comando              | O que faz                                              |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Demo em `/` e playground em `/playground.html`          |
| `npm run build`      | Biblioteca em `dist/` (ESM + UMD + tipos)              |
| `npm run typecheck`  | TypeScript estrito, sem emitir nada                    |
| `npm run sprites`    | Valida a pixel art e reexporta os PNGs de `assets/`    |
| `npm run build:demo` | Demo e playground estáticos em `dist-demo/`            |

## Licença

MIT © Lucas Spiazzi
