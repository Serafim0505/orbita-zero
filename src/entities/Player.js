import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER, DEPTH } from '../config.js';
import audio from '../systems/AudioManager.js';

// [CONCEITO 6 - ESTADOS] Estados possíveis da nave. Todo GameObject do Phaser
// já tem a propriedade `state` (e o método setState) justamente para isso.
export const PLAYER_STATES = {
  NORMAL: 'NORMAL', // pode levar dano
  INVULNERABLE: 'INVULNERAVEL', // piscando após levar dano
  DEAD: 'MORTO',
};

export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Physics.Arcade.Group} bullets pool de tiros do jogador
   */
  constructor(scene, x, y, bullets) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.bullets = bullets;
    this.setDepth(DEPTH.player);

    // [CONCEITO 3 - TRANSFORM E FÍSICA] A nave NÃO é teletransportada: o
    // teclado define uma ACELERAÇÃO, a física integra isso em velocidade e
    // posição, e o DRAG (atrito) freia a nave quando soltamos as teclas.
    // Resultado: movimento com inércia, mais gostoso de controlar.
    this.setDrag(PLAYER.drag);
    this.body.setMaxSpeed(PLAYER.maxSpeed);
    this.setCollideWorldBounds(true);
    // Limita a nave à parte de baixo da tela (retângulo próprio de limites).
    this.body.setBoundsRectangle(
      new Phaser.Geom.Rectangle(0, PLAYER.minY, GAME_WIDTH, GAME_HEIGHT - PLAYER.minY - PLAYER.bottomMargin),
    );
    // Hitbox circular menor que o desenho: o jogador sente que "passou raspando".
    this.body.setCircle(12, 12, 16);

    this.fireCooldown = 0;
    this.tripleShotMs = 0;
    this.hasShield = false;

    // Objetos visuais que acompanham a nave.
    this.flame = scene.add
      .image(x, y + 20, 'flame')
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.player - 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.shieldBubble = scene.add.image(x, y, 'shield-bubble').setDepth(DEPTH.player + 1).setVisible(false);

    this.setState(PLAYER_STATES.NORMAL);
  }

  // [CONCEITO 2 - MOVIMENTAÇÃO] Recebe a direção desejada (-1, 0 ou 1 em cada
  // eixo) e transforma em aceleração. Normalizamos o vetor para que andar na
  // diagonal não seja mais rápido que andar reto.
  move(dirX, dirY) {
    if (this.state === PLAYER_STATES.DEAD) return;
    const length = Math.hypot(dirX, dirY) || 1;
    this.setAcceleration((dirX / length) * PLAYER.acceleration, (dirY / length) * PLAYER.acceleration);
  }

  /** Atira respeitando a cadência (fireRate). Com tiro triplo, dispara em leque. */
  tryShoot() {
    if (this.state === PLAYER_STATES.DEAD || this.fireCooldown > 0) return false;
    this.fireCooldown = PLAYER.fireRate;

    const offsets = this.tripleShotMs > 0 ? [-PLAYER.tripleSpreadDeg, 0, PLAYER.tripleSpreadDeg] : [0];
    for (const offset of offsets) {
      const bullet = this.bullets.get(this.x, this.y - 24);
      if (bullet) bullet.fire(this.x, this.y - 24, -Math.PI / 2 + Phaser.Math.DegToRad(offset), PLAYER.bulletSpeed);
    }
    audio.play('shoot');
    return true;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    // Timers baseados em delta: param automaticamente quando o jogo é pausado.
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    this.tripleShotMs = Math.max(0, this.tripleShotMs - delta);

    // [CONCEITO 3 - TRANSFORM E FÍSICA] Inclinação visual (rotação do
    // Transform) proporcional à velocidade lateral calculada pela física.
    this.setAngle((this.body.velocity.x / PLAYER.maxSpeed) * 10);

    const boosting = this.body.velocity.y < -60;
    this.flame.setPosition(this.x, this.y + 20);
    this.flame.setScale(1, Phaser.Math.FloatBetween(0.7, 1.05) + (boosting ? 0.45 : 0));
    this.shieldBubble.setPosition(this.x, this.y);
  }

  canBeHit() {
    return this.state === PLAYER_STATES.NORMAL;
  }

  // [CONCEITO 6 - ESTADOS] Após levar dano a nave entra no estado
  // INVULNERAVEL por alguns instantes, piscando, e depois volta a NORMAL.
  startInvulnerability(duration) {
    this.setState(PLAYER_STATES.INVULNERABLE);
    this.blinkTween?.stop();
    this.invulnerableTimer?.remove();

    this.blinkTween = this.scene.tweens.add({
      targets: [this, this.flame],
      alpha: 0.15,
      duration: 90,
      yoyo: true,
      repeat: -1,
    });
    this.invulnerableTimer = this.scene.time.delayedCall(duration, () => {
      this.blinkTween.stop();
      this.setAlpha(1);
      this.flame.setAlpha(1);
      if (this.state !== PLAYER_STATES.DEAD) this.setState(PLAYER_STATES.NORMAL);
    });
  }

  activateTripleShot(duration) {
    this.tripleShotMs = duration;
  }

  giveShield() {
    this.hasShield = true;
    this.shieldBubble.setVisible(true).setScale(0.3).setAlpha(1);
    this.scene.tweens.add({ targets: this.shieldBubble, scale: 1, duration: 250, ease: 'Back.Out' });
  }

  breakShield() {
    this.hasShield = false;
    this.shieldBubble.setVisible(false);
  }

  die() {
    this.setState(PLAYER_STATES.DEAD);
    this.blinkTween?.stop();
    this.invulnerableTimer?.remove();
    this.setAcceleration(0, 0);
    this.disableBody(true, true);
    this.flame.setVisible(false);
    this.shieldBubble.setVisible(false);
  }
}
