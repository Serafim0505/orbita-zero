import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, PLAYER, POOL, POWERUP, COLORS, CSS_COLORS,
  GAME_STATES, VICTORY_LIFE_BONUS, BOSS,
} from '../config.js';
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import DroneEnemy from '../entities/DroneEnemy.js';
import ZigZagEnemy from '../entities/ZigZagEnemy.js';
import ShooterEnemy from '../entities/ShooterEnemy.js';
import Asteroid from '../entities/Asteroid.js';
import PowerUp, { POWERUP_TYPES } from '../entities/PowerUp.js';
import Boss from '../entities/Boss.js';
import WaveManager from '../systems/WaveManager.js';
import ScoreManager from '../systems/ScoreManager.js';
import Starfield from '../systems/Starfield.js';
import Effects from '../systems/Effects.js';
import audio from '../systems/AudioManager.js';

// =============================================================================
// GameScene — onde a partida acontece. Responsabilidades:
//  - criar jogador, pools de tiros/inimigos e registrar as colisões;
//  - ler a entrada do jogador;
//  - controlar o FLUXO da partida com a variável `gameState`;
//  - avisar a interface (UIScene) por eventos.
// =============================================================================
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // create() roda a cada nova partida: por isso TODO o estado é reiniciado aqui.
  create() {
    this.gameState = null;
    this.lives = PLAYER.lives;
    this.ending = false;
    this.boss = null;

    this.starfield = new Starfield(this);
    this.effects = new Effects(this);
    this.score = new ScoreManager(this.events);

    this.createPools();
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 70, this.playerBullets);
    this.createCollisions();
    this.createInput();

    this.waves = new WaveManager(this);

    // A HUD é uma cena separada, rodando EM PARALELO por cima desta.
    this.scene.launch('UIScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.waves.stop());

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.setGameState(GAME_STATES.WAVE_TRANSITION);
    this.waves.start();
  }

  // [CONCEITO 6 - ESTADOS] Ponto único para trocar o estado da partida.
  // Fluxo: WAVE_TRANSITION → PLAYING → (próxima onda) ... → BOSS → VICTORY
  //        e, de qualquer um deles, → DEAD quando as vidas acabam.
  setGameState(state) {
    this.gameState = state;
    this.events.emit('state-changed', state);
  }

  get isOver() {
    return this.gameState === GAME_STATES.DEAD || this.gameState === GAME_STATES.VICTORY;
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  // Object pooling: cada grupo tem um maxSize. group.get() devolve um objeto
  // inativo para reaproveitar (ou cria um novo, se ainda couber no limite).
  createPools() {
    this.playerBullets = this.physics.add.group({ classType: Bullet, defaultKey: 'bullet', maxSize: POOL.playerBullets });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, defaultKey: 'enemy-bullet', maxSize: POOL.enemyBullets });
    this.enemyGroups = {
      drone: this.physics.add.group({ classType: DroneEnemy, maxSize: POOL.drones }),
      zigzag: this.physics.add.group({ classType: ZigZagEnemy, maxSize: POOL.zigzags }),
      shooter: this.physics.add.group({ classType: ShooterEnemy, maxSize: POOL.shooters }),
    };
    this.allEnemyGroups = Object.values(this.enemyGroups);
    this.asteroids = this.physics.add.group({ classType: Asteroid, maxSize: POOL.asteroids });
    this.powerUps = this.physics.add.group({ classType: PowerUp, maxSize: POOL.powerUps });
  }

  // [CONCEITO 4 - COLISÕES] Usamos overlap (sobreposição) em vez de collide:
  // não queremos que os objetos se empurrem fisicamente, só DETECTAR o contato
  // e reagir (dano, pontos, coletar item). Cada par chama uma função própria.
  // Obs.: quando um lado é um sprite único, ele vem primeiro nos parâmetros.
  createCollisions() {
    const { physics } = this;
    physics.add.overlap(this.playerBullets, this.allEnemyGroups, this.onBulletHitEnemy, null, this);
    physics.add.overlap(this.playerBullets, this.asteroids, this.onBulletHitAsteroid, null, this);
    physics.add.overlap(this.player, this.allEnemyGroups, this.onPlayerTouchEnemy, null, this);
    physics.add.overlap(this.player, this.asteroids, this.onPlayerTouchEnemy, null, this);
    physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHitByBullet, null, this);
    physics.add.overlap(this.player, this.powerUps, this.onCollectPowerUp, null, this);
  }

  // [CONCEITO 1 - ENTRADAS] Teclado (setas, WASD, Espaço, P, ESC, N) e mouse
  // (botão esquerdo também atira).
  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });
    this.input.keyboard.on('keydown-P', this.pauseGame, this);
    this.input.keyboard.on('keydown-ESC', this.pauseGame, this);
    this.input.keyboard.on('keydown-N', () => this.events.emit('sound-toggled', audio.toggleMute()));
  }

  readDirection() {
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const up = this.cursors.up.isDown || this.keys.up.isDown;
    const down = this.cursors.down.isDown || this.keys.down.isDown;
    return { x: Number(right) - Number(left), y: Number(down) - Number(up) };
  }

  isFiring() {
    return this.cursors.space.isDown || this.input.activePointer.leftButtonDown();
  }

  // ---------------------------------------------------------------------------
  // Loop principal
  // ---------------------------------------------------------------------------
  update(time, delta) {
    this.starfield.update(delta, this.player.x);
    if (this.isOver) return;

    const direction = this.readDirection();
    this.player.move(direction.x, direction.y);
    if (this.isFiring()) this.player.tryShoot();

    this.waves.update();
  }

  // ---------------------------------------------------------------------------
  // Spawns (chamados pelo WaveManager e pelos inimigos)
  // ---------------------------------------------------------------------------
  spawnEnemy(type, speedMultiplier) {
    const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
    const enemy = this.enemyGroups[type].get(x, -40);
    if (!enemy) {
      // Pool cheio: tenta um drone no lugar para a onda não travar.
      return type === 'drone' ? false : this.spawnEnemy('drone', speedMultiplier);
    }
    enemy.spawn(x, -40, speedMultiplier);
    return true;
  }

  spawnAsteroid(speedMultiplier) {
    const asteroid = this.asteroids.get(0, -40);
    if (asteroid) asteroid.spawn(speedMultiplier);
  }

  fireEnemyBullet(x, y, angle, speed) {
    const bullet = this.enemyBullets.get(x, y);
    if (bullet) bullet.fire(x, y, angle, speed);
  }

  countActiveEnemies() {
    return this.allEnemyGroups.reduce((sum, group) => sum + group.countActive(true), 0);
  }

  // ---------------------------------------------------------------------------
  // [CONCEITO 4 - COLISÕES] Reações a cada tipo de contato
  // ---------------------------------------------------------------------------
  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.despawn();
    if (enemy.takeHit(1)) {
      this.destroyEnemy(enemy, true);
    } else {
      this.effects.spark(bullet.x, bullet.y, enemy.color);
      audio.play('hit');
    }
  }

  onBulletHitAsteroid(bullet, asteroid) {
    this.onBulletHitEnemy(bullet, asteroid);
  }

  onPlayerTouchEnemy(player, enemy) {
    if (!enemy.active || !player.canBeHit()) return;
    this.damagePlayer();
    this.destroyEnemy(enemy, false); // bater de frente não dá pontos
  }

  onPlayerHitByBullet(player, bullet) {
    if (!bullet.active || !player.canBeHit()) return;
    bullet.despawn();
    this.damagePlayer();
  }

  onCollectPowerUp(player, powerUp) {
    if (!powerUp.active || this.isOver) return;
    const { kind } = powerUp;
    powerUp.despawn();

    if (kind === 'triple') player.activateTripleShot(POWERUP.tripleShotMs);
    if (kind === 'shield') player.giveShield();
    if (kind === 'life') {
      this.lives = Math.min(PLAYER.maxLives, this.lives + 1);
      this.events.emit('lives-changed', this.lives);
    }

    const info = POWERUP_TYPES[kind];
    this.effects.floatingText(player.x, player.y - 40, info.label, info.color, 20);
    audio.play('powerUp');
  }

  /** Remove um inimigo/asteroide com explosão; opcionalmente dá pontos e sorteia power-up. */
  destroyEnemy(enemy, awardPoints) {
    const { x, y, color, scoreValue } = enemy;
    const isAsteroid = enemy instanceof Asteroid;
    enemy.despawn();
    this.effects.explosion(x, y, color, isAsteroid ? 14 : 22);
    audio.play('explosion');

    if (!awardPoints) return;
    // [CONCEITO 5 - PONTUAÇÃO] Pontos do tipo × multiplicador de combo.
    const gained = this.score.addKill(scoreValue);
    this.effects.floatingText(x, y, `+${gained}`, this.score.multiplier > 1 ? CSS_COLORS.magenta : CSS_COLORS.yellow);
    if (!isAsteroid) this.tryDropPowerUp(x, y);
  }

  tryDropPowerUp(x, y) {
    if (Math.random() >= POWERUP.dropChance) return;
    const options = Object.entries(POWERUP.weights).filter(
      ([kind]) => kind !== 'life' || this.lives < PLAYER.maxLives,
    );
    const total = options.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    const [kind] = options.find(([, w]) => (roll -= w) <= 0) ?? options[0];
    this.powerUps.get(x, y)?.spawn(x, y, kind);
  }

  // ---------------------------------------------------------------------------
  // Chefe (onda 10)
  // ---------------------------------------------------------------------------
  startBoss() {
    this.boss = new Boss(this, GAME_WIDTH / 2, -70);
    // [CONCEITO 4 - COLISÕES] Colisões do chefe são registradas só quando ele existe.
    this.physics.add.overlap(this.boss, this.playerBullets, this.onBulletHitBoss, null, this);
    this.physics.add.overlap(this.player, this.boss, this.onPlayerTouchBoss, null, this);
    this.setGameState(GAME_STATES.BOSS);
    this.events.emit('boss-spawned', this.boss.hp, this.boss.maxHp);
  }

  onBulletHitBoss(boss, bullet) {
    if (!bullet.active || !boss.isVulnerable()) return;
    bullet.despawn();
    this.effects.spark(bullet.x, bullet.y, boss.hp % 2 ? 0xffffff : boss.color);
    if (!boss.takeHit(1)) audio.play('hit');
  }

  onPlayerTouchBoss(player) {
    if (player.canBeHit()) this.damagePlayer();
  }

  // [CONCEITO 5 - VITÓRIA] Chamado pelo Boss ao fim da animação de morte.
  onBossDefeated() {
    if (this.isOver) return;
    this.setGameState(GAME_STATES.VICTORY);
    this.waves.stop();
    const gained = this.score.addKill(BOSS.score);
    this.effects.floatingText(this.boss.x, this.boss.y, `+${gained}`, CSS_COLORS.yellow, 30);
    this.events.emit('boss-defeated');
    this.clearHazards();
    this.player.setAcceleration(0, 0);
    audio.play('victory');
    this.time.delayedCall(2600, () => this.endGame(true));
  }

  /** Explode todos os inimigos e apaga os tiros inimigos da tela. */
  clearHazards() {
    [...this.allEnemyGroups, this.asteroids].forEach((group) => {
      group.getChildren().forEach((enemy) => {
        if (enemy.active) this.destroyEnemy(enemy, false);
      });
    });
    this.enemyBullets.getChildren().forEach((bullet) => {
      if (bullet.active) bullet.despawn();
    });
  }

  // ---------------------------------------------------------------------------
  // [CONCEITO 5 - VIDAS E DERROTA]
  // ---------------------------------------------------------------------------
  damagePlayer() {
    if (this.isOver || !this.player.canBeHit()) return;
    const { player } = this;

    // O escudo absorve um acerto inteiro.
    if (player.hasShield) {
      player.breakShield();
      player.startInvulnerability(PLAYER.shieldHitInvulnerableMs);
      this.effects.explosion(player.x, player.y, COLORS.cyan, 12, 3);
      audio.play('shieldBreak');
      return;
    }

    this.lives -= 1;
    this.score.resetCombo(); // levar dano zera o combo
    this.events.emit('lives-changed', this.lives);

    // [CONCEITO 7 - FEEDBACK] Tremida de câmera + flash vermelho + som.
    this.cameras.main.shake(220, 0.01);
    this.cameras.main.flash(160, 255, 40, 80);
    this.effects.explosion(player.x, player.y, COLORS.red, 14, 3);
    audio.play('damage');

    if (this.lives <= 0) this.killPlayer();
    else player.startInvulnerability(PLAYER.invulnerableMs);
  }

  killPlayer() {
    this.setGameState(GAME_STATES.DEAD);
    this.waves.stop();
    this.effects.explosion(this.player.x, this.player.y, COLORS.cyan, 60, 7);
    this.effects.explosion(this.player.x, this.player.y, COLORS.orange, 30, 5);
    this.player.die();
    this.cameras.main.shake(500, 0.02);
    audio.play('bigExplosion');
    audio.play('gameOver');
    this.time.delayedCall(1800, () => this.endGame(false));
  }

  /** Encerra a partida e troca para a cena de resultado. */
  endGame(victory) {
    if (this.ending) return;
    this.ending = true;
    const bonus = victory ? this.lives * VICTORY_LIFE_BONUS : 0;
    if (bonus) this.score.addBonus(bonus);
    const { highScore, isNewRecord } = ScoreManager.submitScore(this.score.score);

    this.scene.stop('UIScene');
    this.scene.start(victory ? 'VictoryScene' : 'GameOverScene', {
      score: this.score.score,
      bonus,
      lives: this.lives,
      wave: this.waves.wave,
      highScore,
      isNewRecord,
    });
  }

  // ---------------------------------------------------------------------------
  // Pausa
  // ---------------------------------------------------------------------------
  pauseGame() {
    if (this.isOver) return;
    this.scene.launch('PauseScene');
    this.scene.pause();
    this.scene.pause('UIScene');
  }

  // ---------------------------------------------------------------------------
  // Ganchos de depuração (expostos só com ?debug=1 — veja main.js)
  // ---------------------------------------------------------------------------
  debugForceGameOver() {
    if (this.isOver) return;
    this.lives = 0;
    this.events.emit('lives-changed', this.lives);
    this.killPlayer();
  }

  debugSkipToBoss() {
    if (this.isOver || this.boss) return;
    this.clearHazards();
    this.waves.jumpToBoss();
  }

  debugForceVictory() {
    if (!this.ending) this.endGame(true);
  }
}
