<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/hero-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/hero-light.gif" alt="O título kittens em letras de papel recortado, com dois gatos em pixel art andando por cima" width="760">
</picture>

<br>

<img src="https://img.shields.io/badge/dependências-0-e07b39?style=flat-square&labelColor=2b2321" alt="sem dependências">
<img src="https://img.shields.io/badge/gzip-~18_kB-e07b39?style=flat-square&labelColor=2b2321" alt="cerca de 18 kB com gzip">
<img src="https://img.shields.io/badge/TypeScript-tipos_inclusos-e07b39?style=flat-square&labelColor=2b2321" alt="tipos de TypeScript inclusos">
<img src="https://img.shields.io/badge/licença-MIT-e07b39?style=flat-square&labelColor=2b2321" alt="licença MIT">

**[Ver os gatos ao vivo](https://luuspz.dev/kittens/)** · [English](README.md) · [npm](https://www.npmjs.com/package/@catmaitachi/kittens) · [Relatar um problema](https://github.com/catmaitachi/kittens/issues)

</div>

<br>

<div align="center">

Os gatos andam, correm, pulam nos seus cards, escalam paredes, brincam, dormem e se limpam sozinhos.<br>
A [landing page](https://luuspz.dev/kittens/) mostra tudo funcionando. Este README é a referência para usar.

</div>

## Instalar

```bash
npm i @catmaitachi/kittens
```

Usa um agente de IA para programar? Cole [este prompt](docs/agent-prompt.md) nele. O texto explica o que a biblioteca faz, a API inteira e como aplicar no seu projeto. Ele está em inglês, que os agentes entendem bem.

Com a tag, o gato vive no elemento pai:

```html
<section class="area">
  <article class="card">seus elementos de sempre</article>
  <kitten-pet coat="calico" summon></kitten-pet>
</section>

<script type="module">
  import '@catmaitachi/kittens'; // registra o <kitten-pet>
</script>
```

Ou pela classe, apontando o container:

```ts
import { Kitten } from '@catmaitachi/kittens';

const cat = new Kitten(document.querySelector('#area')!, { coat: 'orange', summon: true });
cat.addEventListener('statechange', (e) => console.log(e.detail.state));
```

O gato desenha numa camada própria por cima do container e não mexe no seu layout.

<br>

<h2 align="center">01 · Cinco pelagens</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/coats-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/coats-light.gif" alt="Folha de caderno com amostras de pelagem; ao escolher uma, o gato troca de cor" width="760">
</picture>

<img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/coats-walk.gif" alt="Os cinco gatos andando lado a lado: calico, orange, gray, black e siamese" width="520">

`calico` · `orange` · `gray` · `black` · `siamese`

</div>

Cada pelagem tem um padrão próprio (manchas, listras ou pontas escuras), não só outra cor. Dá para trocar com o gato já na página:

```ts
cat.setCoat('siamese');
```

Também aceita uma paleta sua no lugar do nome. Os tipos `Palette` e `PALETTES` mostram o formato.

<br>

<h2 align="center">02 · Dois cliques e eles vêm</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/summon-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/summon-light.gif" alt="Mural de cortiça: a cada duplo clique aparece um alfinete e os gatos correm até ele" width="760">
</picture>

</div>

Com `summon` ligado, dois cliques no container chamam os gatos até o ponto. Eles pulam e escalam o que estiver no caminho. Pelo código funciona igual, em px dentro do container:

```ts
cat.summonTo(320, 120);
cat.addEventListener('summon', (e) => console.log(e.detail.x, e.detail.y));
```

<br>

<h2 align="center">03 · Parkour pela página</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/parkour-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/parkour-light.gif" alt="Página de scrapbook com polaroids em alturas diferentes; os gatos sobem de uma para outra" width="760">
</picture>

</div>

Os gatos leem o layout de verdade. Pisam no topo dos elementos, escalam as laterais e, no meio da subida, costumam pular para outro lugar. O pulo cresce com o tamanho do container. Você decide onde eles podem ir:

| Quero…                                  | Faço assim                                          |
| --------------------------------------- | --------------------------------------------------- |
| Só alguns elementos como chão           | `platforms: '.card, img'` ou `data-kitten-platform` |
| Que ele ignore um trecho                | `data-kitten-ignore` no elemento                    |
| Que um elemento vire brinquedo          | `data-kitten-toy`                                   |
| Que um elemento não balance com patadas | `data-kitten-static`                                |
| Mais escalada e nada de soneca          | `behaviors: { climb: 5, nap: 0 }`                   |

<br>

<h2 align="center">04 · Uma caixa cheia</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/crowd-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/crowd-light.gif" alt="Caixa de papelão com cinco gatos de pelagens diferentes brincando juntos" width="760">
</picture>

</div>

Gatos no mesmo container se enxergam. Eles se cumprimentam, dão patadinha, brincam de pega-pega e deitam lado a lado. Não precisa configurar nada, só criar mais de um:

```ts
for (const coat of ['calico', 'orange', 'gray', 'black', 'siamese']) {
  const cat = new Kitten(box, { coat });
  cat.addEventListener('social', (e) => console.log(e.detail.kind));
}
```

<br>

<h2 align="center">Poses</h2>

<div align="center">

<table>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-tailFlick.gif" width="96" alt=""><br><sub>sentado</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-walk.gif" width="96" alt=""><br><sub>andando</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-run.gif" width="96" alt=""><br><sub>correndo</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-wallClimb.gif" width="96" alt=""><br><sub>escalando</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-groom.gif" width="96" alt=""><br><sub>se limpando</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-yawn.gif" width="96" alt=""><br><sub>bocejando</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-stretch.gif" width="96" alt=""><br><sub>espreguiçando</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-bat.gif" width="96" alt=""><br><sub>dando patada</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-loafWag.gif" width="96" alt=""><br><sub>deitado</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-sleep.gif" width="96" alt=""><br><sub>dormindo</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pose-dangle.gif" width="96" alt=""><br><sub>no colo</sub></td>
    <td align="center"><sub>clique para miar,<br>pare o mouse em cima<br>para fazer carinho,<br>arraste para pegar</sub></td>
  </tr>
</table>

</div>

A arte é uma grade de texto em [`src/sprites/frames.ts`](https://github.com/catmaitachi/kittens/blob/main/src/sprites/frames.ts), com 28 frames desenhados sem mancha nenhuma. A pelagem vem da máscara de cada raça em [`src/sprites/palette.ts`](https://github.com/catmaitachi/kittens/blob/main/src/sprites/palette.ts), que pinta pixel a pixel na hora de gerar a spritesheet. As spritesheets prontas ficam em [`assets/`](https://github.com/catmaitachi/kittens/tree/main/assets).

<br>

<h2 align="center">Referência</h2>

### Opções

Na tag, cada opção vira um atributo de mesmo nome (`<kitten-pet coat="black" scale="2" summon>`). A tag aceita também `container="seletor"` para morar num ancestral em vez do pai.

| Opção         | Padrão     | O que faz                                                             |
| ------------- | ---------- | --------------------------------------------------------------------- |
| `coat`        | `'calico'` | `calico`, `orange`, `gray`, `black`, `siamese` ou uma paleta sua      |
| `scale`       | `3`        | Tamanho de cada pixel da arte, em px. Inteiros mantêm a arte nítida   |
| `speed`       | `1`        | Multiplicador da velocidade de andar e correr                         |
| `platforms`   | `'auto'`   | Onde ele pode pisar: `'auto'` ou um seletor CSS                       |
| `interactive` | `true`     | Clique, carinho e arrastar                                            |
| `summon`      | `false`    | Dois cliques no container chamam o gato até o ponto                   |
| `nudge`       | `true`     | Os elementos balançam de leve quando levam patada                     |
| `behaviors`   | —          | Peso de cada comportamento; `0` desliga (ex.: `{ nap: 2, climb: 0 }`) |
| `phrases`     | `meow!`, … | Frases do balão de fala                                               |
| `name`        | `'Kitten'` | Nome do gato, que vai nos eventos                                     |
| `seed`        | aleatória  | A mesma semente repete as mesmas escolhas, bom para testes            |
| `x`           | aleatório  | Posição inicial no chão, em px                                        |

Comportamentos que `behaviors` aceita: `idle`, `loaf`, `wander`, `explore`, `climb`, `groom`, `nap`, `play`, `stretch`, `social`.

### Métodos e leituras

| Chamada              | O que faz                                          |
| -------------------- | -------------------------------------------------- |
| `do(action)`         | Pede uma ação agora                                |
| `meow('oi!')`        | Mia com um balão de fala                           |
| `summonTo(x, y)`     | Chama o gato para um ponto do container            |
| `setCoat('black')`   | Troca a pelagem sem recriar o gato                 |
| `pause()`/`resume()` | Congela e retoma a animação                        |
| `destroy()`          | Remove o gato e solta tudo                         |
| `state`, `energy`    | O que ele faz agora e quanto está disposto (0 a 1) |
| `position`           | `{ x, y }` dentro do container                     |

Ações de `do(...)`: `sit`, `walk`, `jump`, `climb`, `play`, `bat`, `groom`, `stretch`, `loaf`, `sleep`, `meow`, `explore`, `wander`, `social`.

### Eventos

A instância é um `EventTarget`. A camada também dispara os mesmos eventos com o prefixo `kitten:`, e eles borbulham, então dá para ouvir no container. Todos trazem `cat` no `detail`.

| Evento                                    | `detail`                                            |
| ----------------------------------------- | --------------------------------------------------- |
| `statechange`                             | `{ state, previous }`                               |
| `meow`                                    | `{ text }`                                          |
| `land`                                    | `{ element, height }`, com `element` `null` no chão |
| `nudge`                                   | `{ element }` que levou a patada                    |
| `summon`                                  | `{ x, y }` do chamado                               |
| `social`                                  | `{ kind, other }`, o que ele fez com outro gato     |
| `click`, `pet`, `grab`, `drop`, `destroy` | só `cat`                                            |

Com `prefers-reduced-motion`, os gatos ficam mais calmos e sem partículas. A animação para quando a aba fica escondida.

### Desenvolvimento

| Comando              | O que faz                                           |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Landing page em desenvolvimento (pasta `site/`)     |
| `npm run build`      | Biblioteca em `dist/` (ESM + UMD + tipos)           |
| `npm run build:site` | Landing page estática em `dist-site/`               |
| `npm run typecheck`  | TypeScript estrito, sem emitir nada                 |
| `npm run sprites`    | Valida a pixel art e reexporta os PNGs de `assets/` |

<br>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/footer-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/footer-light.gif" alt="Um gato siamês sentado na borda do rodapé" width="760">
</picture>

Feito por [Lucas Spiazzi](https://github.com/catmaitachi) · Inspirado no [VS Code Pets](https://github.com/tonybaloney/vscode-pets) · Licença MIT

</div>
