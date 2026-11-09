# Órbita Zero — guia de estudo para a apresentação

Este guia explica **como o jogo funciona por dentro**, em linguagem simples, para você conseguir apresentar e
responder perguntas do professor. Os trechos de código são curtos e foram tirados do projeto (às vezes
resumidos). Dica: no VS Code, procure por `[CONCEITO` para ver todos os pontos marcados no código.

---

## 1. Visão geral da arquitetura

O jogo é dividido em quatro tipos de arquivo:

| Pasta / arquivo | Papel | Exemplo |
| --- | --- | --- |
| `src/config.js` | **Números ajustáveis** do jogo | velocidade da nave, vidas, pontos, chance de power-up |
| `src/scenes/` | **Telas** (cenas do Phaser) | menu, jogo, HUD, pausa, fim de jogo, vitória |
| `src/entities/` | **Objetos do jogo** (classes que herdam de `Sprite`) | nave, tiro, inimigos, chefe, asteroide, item |
| `src/systems/` | **Sistemas** que não são objetos na tela | ondas, pontuação, áudio, efeitos, fundo de estrelas |

Por que separar assim? Cada arquivo tem **uma responsabilidade**. Se o professor pedir "mude a velocidade dos
inimigos", você só mexe no `config.js`. Se pedir "como funciona o chefe?", está tudo em `Boss.js`.

### Gráficos e sons sem arquivos

- **Gráficos:** a `BootScene` desenha formas (triângulos, círculos, polígonos) com `Phaser.Graphics` e
  transforma o desenho em textura:

  ```js
  this.draw('drone', 40, 36, (g) => {
    g.fillStyle(COLORS.magenta, 1);
    g.fillTriangle(4, 3, 36, 3, 20, 32);   // corpo
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(20, 11, 3);              // "olho"
  });                                     // → generateTexture('drone', 40, 36)
  ```

- **Sons:** o `AudioManager` usa a **Web Audio API**. Cada som é um oscilador (onda quadrada, senoidal...) cuja
  frequência e volume mudam rapidamente. Explosão = ruído branco passando por um filtro que vai "fechando".

  ```js
  shoot: (a) => a.tone({ type: 'square', from: 900, to: 380, duration: 0.07, volume: 0.05 }),
  ```

  O navegador só libera áudio depois que o usuário aperta uma tecla ou clica — por isso o `AudioContext` só é
  criado em `audio.unlock()`, chamado no primeiro `keydown`/`pointerdown` (`main.js`).

---

## 2. Fluxo das cenas (máquina de estados do jogo)

```
BootScene ──► MenuScene ──ENTER──► GameScene + UIScene (em paralelo)
                 ▲                      │        ▲
                 │                  P / ESC      │ P / ESC
                 │                      ▼        │
                 │◄──────M────────── PauseScene ─┘
                 │
                 │◄──M── GameOverScene ◄── vidas = 0
                 │◄──M── VictoryScene  ◄── chefe derrotado
                          (ENTER nas duas telas = jogar de novo)
```

- **BootScene:** gera texturas e prepara o áudio, depois chama `this.scene.start('MenuScene')`.
- **MenuScene:** título, controles, inimigos, recorde. ENTER (ou clique) inicia o jogo.
- **GameScene:** a partida em si. Ao começar, ela "lança" a HUD: `this.scene.launch('UIScene')`.
- **UIScene:** a HUD, desenhada **por cima** do jogo, com câmera própria (o tremor de tela não afeta o placar).
- **PauseScene:** ao apertar P/ESC, o jogo chama `this.scene.pause()` — física, timers e animações congelam.
- **GameOverScene / VictoryScene:** recebem os dados da partida (`score`, `wave`, `isNewRecord`...) e mostram o resultado.

A ordem das cenas no `main.js` define quem é desenhado por cima (as últimas da lista ficam na frente).

### Estados dentro da partida

Além das cenas, o `GameScene` tem a variável `gameState`:

| Estado | Quando |
| --- | --- |
| `WAVE_TRANSITION` | aviso "ONDA X" na tela; nada nasce ainda |
| `PLAYING` | onda acontecendo |
| `BOSS` | luta contra o chefe |
| `DEAD` | vidas acabaram (explosão e depois tela de fim de jogo) |
| `VICTORY` | chefe destruído (comemoração e depois tela de vitória) |

```js
setGameState(state) {
  this.gameState = state;
  this.events.emit('state-changed', state);
}
```

E as **entidades** também têm estados (usando a propriedade `state` que todo objeto do Phaser já possui):

- **Nave:** `NORMAL` → (leva dano) → `INVULNERAVEL` (pisca 1,5 s) → `NORMAL`; ou `MORTO`.
- **Atirador:** `ENTRANDO` → `ATACANDO` (para e atira 4 vezes) → `SAINDO`.
- **Chefe:** `ENTRANDO` → `LEQUE` ⇄ `MIRA` (alterna a cada 4,5 s) → `MORRENDO`.

---

## 3. Física e movimentação

O jogo usa a **física Arcade** do Phaser: cada sprite com física tem um `body` com posição, velocidade,
aceleração e uma "caixa de colisão" (hitbox).

### A nave (aceleração + drag)

A nave **não é teletransportada**. As teclas definem uma **direção**; essa direção vira **aceleração**. A física
transforma aceleração em velocidade e velocidade em posição a cada quadro. Quando você solta a tecla, o **drag**
(atrito) freia a nave aos poucos. Isso dá **inércia**, e o controle fica mais suave.

```js
// Player.js (construtor)
this.setDrag(PLAYER.drag);               // atrito quando não há aceleração
this.body.setMaxSpeed(PLAYER.maxSpeed);  // limite de velocidade

// Player.js
move(dirX, dirY) {
  const length = Math.hypot(dirX, dirY) || 1;  // normaliza: diagonal não fica mais rápida
  this.setAcceleration((dirX / length) * PLAYER.acceleration, (dirY / length) * PLAYER.acceleration);
}
```

A nave só pode andar na parte de baixo da tela porque recebeu um **retângulo de limites próprio**
(`body.setBoundsRectangle`).

### Inimigos: física × Transform

- **Drone:** só uma velocidade para baixo (`setVelocity(0, speed)`). Pura física.
- **Zigue-zague:** mistura os dois jeitos — física no eixo Y e **Transform** no eixo X, calculando a posição
  diretamente com uma função seno:

  ```js
  this.x = this.baseX + Math.sin(this.elapsed * frequency + this.phase) * amplitude;
  ```

- **Asteroide:** velocidade diagonal + **velocidade angular** (`setAngularVelocity`): a física gira o sprite.
- **Chefe:** flutua de um lado para o outro com seno (Transform), mais rápido quando está com pouca vida.

### Dificuldade progressiva

O `WaveManager` calcula tudo a partir do número da onda:

```js
get speedMultiplier() { return 1 + (this.wave - 1) * WAVES.speedStep; }        // +10% por onda
get spawnInterval()  { return Math.max(380, 1150 - (this.wave - 1) * 85); }    // nasce mais rápido
get enemiesInWave()  { return 6 + (this.wave - 1) * 3; }                       // mais inimigos
```

---

## 4. Colisões

Usamos `physics.add.overlap` (**sobreposição**) em vez de `collide`: não queremos que os objetos se empurrem,
só **detectar** o contato e reagir.

```js
physics.add.overlap(this.playerBullets, this.allEnemyGroups, this.onBulletHitEnemy, null, this);
physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHitByBullet, null, this);
physics.add.overlap(this.player, this.powerUps, this.onCollectPowerUp, null, this);
```

Cada par chama uma função. Exemplo — tiro acerta inimigo:

```js
onBulletHitEnemy(bullet, enemy) {
  if (!bullet.active || !enemy.active) return;   // proteção: pode já ter sido removido
  bullet.despawn();                              // tiro volta para o pool
  if (enemy.takeHit(1)) this.destroyEnemy(enemy, true);   // morreu: explosão + pontos
  else { this.effects.spark(bullet.x, bullet.y, enemy.color); audio.play('hit'); }
}
```

As hitboxes são **círculos menores que o desenho** (`body.setCircle`), o que deixa o jogo mais justo: o jogador
sente que "passou raspando".

### Object pooling

Tiros e inimigos são criados aos montes. Em vez de `new` + `destroy` toda hora, cada tipo tem um **grupo com
`maxSize`**. `group.get()` devolve um objeto **inativo** para reaproveitar:

```js
this.playerBullets = this.physics.add.group({ classType: Bullet, defaultKey: 'bullet', maxSize: 40 });
// ...
const bullet = this.bullets.get(this.x, this.y - 24);
if (bullet) bullet.fire(x, y, angle, speed);   // "acorda" o tiro
// quando sai da tela ou acerta algo:
this.disableBody(true, true);                  // desativa e esconde (volta para o pool)
```

Vantagem: menos trabalho para o coletor de lixo do JavaScript e nada de "engasgos" no meio do jogo.

---

## 5. Pontuação, vidas, vitória e derrota

- **Pontos:** cada inimigo tem um valor (`config.js`). O `ScoreManager` multiplica pelo **combo**:

  ```js
  this.comboKills += 1;
  this.multiplier = Math.min(5, 1 + Math.floor(this.comboKills / 5));  // x2 aos 5 abates, x3 aos 10...
  const gained = baseValue * this.multiplier;
  ```

- **Dano:** `damagePlayer()` — se tem escudo, ele quebra e nada mais acontece. Senão: perde 1 vida, **zera o
  combo**, tremor de tela, flash vermelho, som e 1,5 s de invencibilidade piscando.
- **Derrota:** vidas = 0 → estado `DEAD` → explosão grande → `GameOverScene`.
- **Vitória:** o chefe chega a 0 de vida → animação de explosões → estado `VICTORY` → `VictoryScene` com bônus de
  1.000 pontos por vida restante.
- **Recorde:** salvo no `localStorage` dentro de `try/catch` (se o navegador bloquear, o jogo continua normal).

### Comunicação jogo → HUD por eventos

O `GameScene` **não mexe** nos textos da HUD. Ele só emite eventos, e a `UIScene` escuta:

```js
// GameScene / ScoreManager
this.events.emit('score-changed', this.score);
// UIScene
gameScene.events.on('score-changed', (score) => this.setScore(score));
```

Quando a partida acaba, a `UIScene` remove seus ouvintes (`off`) — senão, ao jogar de novo, cada evento seria
tratado duas vezes.

---

## 6. Ondas e o chefe

**Ondas (`WaveManager`):**

1. `startNextWave()` aumenta o número da onda, muda o estado para `WAVE_TRANSITION` e mostra "ONDA X".
2. Depois de 2,4 s, `beginWave()` cria um timer que faz nascer um inimigo a cada `spawnInterval` ms.
   O tipo é sorteado com **pesos** (atiradores ficam mais comuns nas ondas finais). Às vezes vem um asteroide junto.
3. A onda termina quando **todos já nasceram e nenhum está vivo**. Aí começa a próxima.
4. Na onda 10, aparece "ALERTA!" (com sirene e tela piscando em vermelho) e o chefe entra.

**Chefe (`Boss.js`):**

- 140 de vida, barra na HUD (fica laranja abaixo de 50%).
- **Padrão LEQUE:** 9 tiros espalhados em arco de 110°, deslocando o arco a cada rajada.
- **Padrão MIRA:** rajadas de 3 tiros saindo dos dois canhões **na direção atual do jogador**:

  ```js
  const angle = Phaser.Math.Angle.Between(x, y, player.x, player.y);   // atan2
  this.scene.fireEnemyBullet(x, y, angle, BOSS.aimedSpeed);
  ```

- Os padrões alternam a cada 4,5 s. Com menos de 50% de vida ele "fica bravo": move mais rápido e atira 30%
  mais rápido. Durante a luta, drones de apoio aparecem (e podem soltar power-ups).

---

## 7. Power-ups

Ao destruir um inimigo há **12% de chance** (`POWERUP.dropChance`) de cair um item, sorteado com pesos:

| Item | Efeito |
| --- | --- |
| Tiro triplo (amarelo) | 8 s atirando 3 tiros em leque |
| Escudo (ciano) | bolha que absorve 1 acerto |
| Vida extra (vermelho) | +1 vida (máx. 5; não cai se já estiver no máximo) |

O item cai devagar e "pulsa" para chamar atenção. Ao encostar na nave: efeito aplicado, texto flutuante e som.
O tempo restante do tiro triplo aparece na HUD.

---

## 8. Feedback ao jogador (o "suco" do jogo)

- **Flash branco** no inimigo atingido (`setTintFill(0xffffff)` por 70 ms).
- **Explosões** com partículas coloridas e um anel de choque que expande.
- **Texto flutuante** com os pontos ganhos (fica magenta quando há combo).
- **Tremor de tela** e **flash vermelho** ao levar dano.
- **Fundo em parallax:** 3 camadas de estrelas em velocidades diferentes, que também deslizam um pouco para os
  lados conforme a nave se move.
- **Sons** para tiro, acerto, explosão, dano, escudo, power-up, onda, alarme do chefe, game over e vitória.
- **Avisos** grandes no centro ("ONDA 3", "ALERTA!") e HUD com pontos, combo, vidas, onda e barra do chefe.

---

## 9. Testes automatizados

`tests/smoke.spec.js` usa o **Playwright** para abrir o jogo num navegador de verdade e verificar o fluxo
inteiro (menu → jogo → pausa → ~20 s de jogo → game over → jogar de novo → chefe → vitória → menu), além de
garantir **zero erros no console**. Para isso existe o objeto `window.__ORBITA__`, que só é criado quando a URL
tem `?debug=1` — no jogo normal ele não existe.

---

## 10. Perguntas que o professor pode fazer (com respostas)

**1. Por que você usou aceleração em vez de mudar a posição da nave direto?**
Porque com aceleração + drag a nave tem inércia: ela ganha velocidade aos poucos e freia aos poucos. Fica mais
natural e mostra o uso da física. Mudar `x`/`y` direto seria um "teletransporte" de alguns pixels por quadro.

**2. Qual a diferença entre `overlap` e `collide` no Phaser?**
`collide` detecta o contato **e separa** os corpos (um empurra o outro, como uma parede). `overlap` só detecta e
chama a função. Num shooter não queremos empurrões: o tiro some e o inimigo toma dano, então usei `overlap`.

**3. O que é object pooling e por que usar?**
É reaproveitar objetos em vez de criar e destruir. Os grupos têm `maxSize`; `group.get()` devolve um objeto
inativo. Como o jogo cria dezenas de tiros por segundo, isso evita trabalho do coletor de lixo e quedas de FPS.

**4. Como funciona a máquina de estados do jogo?**
Em três níveis: as **cenas** (menu, jogo, pausa, fim), a variável `gameState` do `GameScene`
(`WAVE_TRANSITION`, `PLAYING`, `BOSS`, `DEAD`, `VICTORY`) e os estados das entidades (nave invulnerável, atirador
entrando/atacando/saindo, chefe alternando padrões). Cada estado define o que pode acontecer naquele momento —
por exemplo, em `DEAD` o `update` não lê mais o teclado.

**5. Por que a HUD é uma cena separada?**
Para separar interface de regra de jogo. A `UIScene` roda em paralelo, por cima, com câmera própria — então o
tremor de tela do jogo não sacode o placar. Ela só escuta eventos (`score-changed`, `lives-changed`...).

**6. Como o inimigo atirador mira no jogador?**
Ele calcula o ângulo entre a sua posição e a do jogador com `Phaser.Math.Angle.Between` (que usa `atan2`) e
lança o tiro nessa direção com `physics.velocityFromRotation`. Ele mira onde o jogador **está** no momento do tiro.

**7. Como funciona a dificuldade progressiva?**
O `WaveManager` calcula, a partir do número da onda, um multiplicador de velocidade (+10% por onda), o intervalo
entre inimigos (cai 85 ms por onda, mínimo 380 ms) e a quantidade de inimigos (+3 por onda). Tipos mais difíceis
também ficam mais prováveis no sorteio.

**8. Como você fez gráficos e sons sem baixar arquivos?**
Gráficos: desenho formas com `Phaser.Graphics` e uso `generateTexture` para virar textura. Sons: Web Audio API,
com osciladores e ruído branco, mudando frequência e volume em poucos milissegundos. Assim não há problema de
direitos autorais nem de arquivo faltando.

**9. O que acontece quando o jogador pausa? Os timers continuam correndo?**
Não. `scene.pause()` congela o `update`, a física, os timers (`time.delayedCall`) e os tweens da cena. Os timers
próprios da nave (cadência do tiro e duração do tiro triplo) diminuem usando o `delta` do quadro, então também
param. O Phaser ainda "solta" as teclas ao pausar, para a nave não continuar andando sozinha.

**10. Como o recorde é salvo? E se der erro?**
No `localStorage` do navegador (`ScoreManager.submitScore`). Leitura e escrita ficam dentro de `try/catch`: se o
navegador bloquear o armazenamento (modo privado, por exemplo), o jogo continua funcionando, só não guarda o
recorde.
