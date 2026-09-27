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

<h2 align="center">01 · Pinte o gato do seu jeito</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/customizer-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/customizer-light.gif" alt="Um gato sob um holofote num palco escuro, com as pelagens à esquerda e as silhuetas das poses à direita; ao escolher uma pelagem, o gato é repintado" width="760">
</picture>

<img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/coats-walk.gif" alt="Os cinco gatos andando lado a lado: calico, orange, gray, black e siamese" width="520">

`calico` · `orange` · `gray` · `black` · `siamese`

</div>

Cada pelagem tem um padrão próprio de manchas, listras ou pontas escuras por cima das cores. Dá para trocar com o gato já na página:

```ts
cat.setCoat('siamese');
```

Por baixo, uma pelagem é um `KittenCoat`: uma matriz de pixels 35×27 (a "skin", como a skin do Minecraft) mais algumas cores sólidas para o que não é pelo. Cabeça e rabo têm uma área cada, compartilhada por todas as poses, então um focinho ou um rabo listrado aparece em todas. O corpo, com as patas, tem uma área para cada tipo de pose (sentado, em pé e andando, deitado, espreguiçando, no colo), pixel a pixel, então dá para pintar o gato sentado sem mexer no gato andando. Cada célula guarda a cor exata que aparece, sombra incluída.

```ts
interface KittenCoat {
  name: string;                             // vale em coat="nome" depois de registrar
  skin: readonly string[];                  // 15 linhas de 20 caracteres; '.' é célula sem uso
  colors: Record<string, string>;           // caractere da skin -> '#rrggbb'
  outline: string;                          // o contorno escuro do gato
  outlineSoft: string;                      // as dobras mais suaves, como o pescoço
  nose: string;                             // nariz, língua e almofadinhas das patas
  eyes: { left: string; right: string };    // cada olho com a cor dele
}
```

`registerCoat(coat)` adiciona uma pelagem à lista para `coat="nome"` encontrar, e `resolveCoat(coat)` é o que a biblioteca usa por dentro para transformar um nome ou objeto num `KittenCoat` (nome desconhecido cai no calico, e um objeto parcial tem os campos que faltam completados com os do calico também). `COATS` tem as cinco pelagens prontas, caso você queira ler ou ajustar uma:

```ts
import { registerCoat, COATS } from '@catmaitachi/kittens';

registerCoat({
  ...COATS.calico,
  name: 'meia-noite',
  colors: { ...COATS.calico.colors, a: '#1a1a1a' },
  eyes: { left: '#39c5bb', right: '#39c5bb' },
});

const cat = new Kitten(el, { coat: 'meia-noite' });
```

O jeito mais fácil de montar uma é o customizador no topo da [landing page](https://luuspz.dev/kittens/). Comece de uma das cinco pelagens, escolha uma pose à direita e aperte o lápis para pintar pixel a pixel, passando pelos quadros da pose com as setas embaixo do gato (dá para usar o teclado também: as setas escolhem o pixel e o Enter pinta). Pintar um pixel do contorno, do nariz ou de um olho muda essa cor no gato inteiro, e cada olho guarda a sua. Tem conta-gotas, uma fileira com as cores que você já usou, desfazer e refazer (Ctrl+Z e Ctrl+Shift+Z) e um botão que apaga a sua pelagem para recomeçar. A página guarda a sua pelagem como "a sua" entre uma visita e outra. Quando terminar, "código da pelagem" mostra o `registerCoat({...})` pronto para copiar, e o botão Prompt copia uma mensagem para colar no seu agente de código e ele adicionar a pelagem ao projeto.

<br>

<h2 align="center">02 · Parkour pela página</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/parkour-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/parkour-light.gif" alt="Uma sala em pixel art com sofá, janela e duas prateleiras; os gatos pulam e escalam de um móvel para outro" width="760">
</picture>

</div>

Os gatos leem o layout de verdade. Pisam no topo dos elementos, escalam as laterais e, no meio da subida, costumam pular para outro lugar. O pulo cresce com o tamanho do container. Na sala da landing page, os móveis são SVG comum e alguns spans vazios com `data-kitten-platform` marcam onde o gato pode pisar: o assento e os braços do sofá, o peitoril da janela, cada prateleira. Você decide onde eles podem ir:

| Quero…                                  | Faço assim                                          |
| --------------------------------------- | --------------------------------------------------- |
| Só alguns elementos como chão           | `platforms: '.card, img'` ou `data-kitten-platform` |
| Que ele ignore um trecho                | `data-kitten-ignore` no elemento                    |
| Que um elemento vire brinquedo          | `data-kitten-toy`                                   |
| Que um elemento não balance com patadas | `data-kitten-static`                                |
| Mais escalada e nada de soneca          | `behaviors: { climb: 5, nap: 0 }`                   |

<br>

<h2 align="center">03 · Dois cliques e eles vêm</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/summon-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/summon-light.gif" alt="Uma folha de caderno rasgada com traços de caneta servindo de chão; a cada duplo clique aparece um ratinho circulado a caneta e os gatos correm até ele" width="760">
</picture>

</div>

Com `summon` ligado, dois cliques no container chamam os gatos até o ponto. Eles pulam e escalam o que estiver no caminho. Pelo código funciona igual, em px dentro do container:

```ts
cat.summonTo(320, 120);
cat.addEventListener('summon', (e) => console.log(e.detail.x, e.detail.y));
```

Dá também para arrastar o gato e pegar no colo, e ele fica pendurado na sua mão. Segurar pode. Chacoalhar, não. A paciência vai de 0 a 100 e cada chacoalhão forte (uma reversão brusca de direção com velocidade alta) tira 50. Depois de um chacoalhão, o próximo só conta um segundo depois, então dois seguidos bastam. No zero o gato se solta e fica emburrado: aparece uma barra de paciência sobre a cabeça, ele bufa de vez em quando, não deixa mais pegar e sai correndo se o cursor chegar perto. A barra enche sozinha em uns 12 segundos e, cheia, o gato se acalma e ela some.

```ts
cat.addEventListener('angry', () => console.log('fugiu!'));
cat.addEventListener('calm', () => console.log('se acalmou'));
console.log(cat.patience); // 0 a 100
console.log(cat.angry);    // true enquanto está bravo
```

<br>

<h2 align="center">04 · Uma caixa cheia</h2>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/crowd-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/pt/crowd-light.gif" alt="Caixa de papelão com cinco gatos de pelagens diferentes brincando juntos" width="760">
</picture>

</div>

Gatos no mesmo container se enxergam. Eles se cumprimentam, dão patadinha, brincam de pega-pega e deitam lado a lado. Não precisa configurar nada, é só criar mais de um:

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

A arte é uma grade de texto em [`src/sprites/frames.ts`](https://github.com/catmaitachi/kittens/blob/main/src/sprites/frames.ts), com 28 frames desenhados sem pelagem nenhuma. [`src/sprites/skin.ts`](https://github.com/catmaitachi/kittens/blob/main/src/sprites/skin.ts) mapeia cada pixel de pelo de cada frame para uma célula da matriz 35×27 da pelagem (`skinCellAt`) e cada pixel de olho para `left` ou `right` (`eyeAt`), e é a partir disso que a spritesheet é pintada. As spritesheets prontas ficam em [`assets/`](https://github.com/catmaitachi/kittens/tree/main/assets), junto com um `skin-<nome>.png` da matriz crua de cada pelagem.

<br>

<h2 align="center">Referência</h2>

### Opções

Na tag, cada opção vira um atributo de mesmo nome (`<kitten-pet coat="black" scale="2" summon>`). A tag aceita também `container="seletor"` para morar num ancestral em vez do pai.

| Opção         | Padrão     | O que faz                                                             |
| ------------- | ---------- | --------------------------------------------------------------------- |
| `coat`        | `'calico'` | `calico`, `orange`, `gray`, `black`, `siamese` ou um `KittenCoat` seu |
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
| `patience`, `angry`  | Paciência restante (0 a 100) e se está bravo agora |
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
| `angry`, `calm`                           | fugiu e ficou bravo, ou se acalmou de novo          |
| `click`, `pet`, `grab`, `drop`, `destroy` | só `cat`                                            |

Com `prefers-reduced-motion`, os gatos ficam mais calmos e sem partículas. A animação para quando a aba fica escondida.

### Desenvolvimento

| Comando              | O que faz                                           |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Landing page em desenvolvimento (pasta `site/`)     |
| `npm run build`      | Biblioteca em `dist/` (ESM + UMD + tipos)           |
| `npm run build:site` | Landing page estática em `dist-site/`               |
| `npm run typecheck`  | TypeScript estrito, sem emitir nada                 |
| `npm run check`      | Confere a matriz da pelagem e o mapeamento pixel → célula |
| `npm run sprites`    | Valida a pixel art e reexporta os PNGs de `assets/` |

<br>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/footer-dark.gif">
  <img src="https://raw.githubusercontent.com/catmaitachi/kittens/main/docs/footer-light.gif" alt="Um gato siamês sentado na borda do rodapé" width="760">
</picture>

Feito por [Lucas Spiazzi](https://github.com/catmaitachi) · Inspirado no [VS Code Pets](https://github.com/tonybaloney/vscode-pets) · Licença MIT

</div>
