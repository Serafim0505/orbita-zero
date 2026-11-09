import Phaser from 'phaser';
import { GAME_WIDTH, BOSS, COLORS, DEPTH } from '../config.js';
import audio from '../systems/AudioManager.js';
import { randomOffset } from '../systems/Effects.js';

// [CONCEITO 6 - ESTADOS] Máquina de estados do chefe:
//   ENTRANDO  → desce até sua posição (invulnerável enquanto chega)
//   LEQUE     → padrão 1: rajadas em leque para baixo
//   MIRA      → padrão 2: sequências de tiros mirados no jogador
//   (LEQUE e MIRA se alternam a cada BOSS.patternDuration ms)
//   MORRENDO  → série de explosões e então a vitória
export const BOSS_STATES = {
  ENTERING: 'ENTRANDO',
  SPREAD: 'LEQUE',
  AIMED: 'MIRA',
  DYING: 'MORRENDO',
};

export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.boss);
    this.body.setSize(190, 80).setOffset(15, 18);

    this.color = COLORS.purple;
    this.maxHp = BOSS.hp;
    this.hp = BOSS.hp;
    this.phase = 0; // fase da onda senoidal do movimento lateral
    this.patternTimer = 0;
    this.fireTimer = 0;
    this.burstShots = 0;
    this.spreadFlip = false;

    this.setState(BOSS_STATES.ENTERING);
    this.setVelocityY(BOSS.entrySpeed);
  }

  get enraged() {
    return this.hp <= this.maxHp / 2;
  }

  isVulnerable() {
    return this.state === BOSS_STATES.SPREAD || this.state === BOSS_STATES.AIMED;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    switch (this.state) {
      case BOSS_STATES.ENTERING:
        if (this.y >= BOSS.entryY) {
          this.setVelocityY(0);
          this.y = BOSS.entryY;
          this.changePattern(BOSS_STATES.SPREAD);
        }
        break;
      case BOSS_STATES.SPREAD:
      case BOSS_STATES.AIMED:
        this.updateMovement(delta);
        this.updateAttack(delta);
        break;
      default:
        break;
    }
  }

  // [CONCEITO 3 - TRANSFORM] O chefe "flutua" de um lado para o outro com
  // x = centro + A·sen(fase). Irritado (vida < 50%), ele se move mais rápido.
  updateMovement(delta) {
    this.phase += delta * BOSS.moveFrequency * (this.enraged ? 1.6 : 1);
    this.x = GAME_WIDTH / 2 + Math.sin(this.phase) * BOSS.moveAmplitude;
  }

  updateAttack(delta) {
    this.patternTimer -= delta;
    if (this.patternTimer <= 0) {
      this.changePattern(this.state === BOSS_STATES.SPREAD ? BOSS_STATES.AIMED : BOSS_STATES.SPREAD);
      return;
    }

    this.fireTimer -= delta;
    if (this.fireTimer > 0) return;
    const rate = this.enraged ? BOSS.enragedRate : 1;

    if (this.state === BOSS_STATES.SPREAD) {
      this.fireSpread();
      this.fireTimer = BOSS.spreadInterval * rate;
    } else {
      this.fireAimed();
      this.burstShots += 1;
      const endOfBurst = this.burstShots % BOSS.burstSize === 0;
      this.fireTimer = endOfBurst ? BOSS.burstPause * rate : BOSS.burstInterval;
    }
  }

  changePattern(state) {
    this.setState(state);
    this.patternTimer = BOSS.patternDuration;
    this.fireTimer = 600; // respiro curto antes do novo padrão
    this.burstShots = 0;
  }

  /** Padrão LEQUE: N tiros espalhados em arco; alterna o deslocamento a cada rajada. */
  fireSpread() {
    const count = BOSS.spreadBullets;
    const spread = Phaser.Math.DegToRad(BOSS.spreadAngleDeg);
    const step = spread / (count - 1);
    const offset = this.spreadFlip ? step / 2 : 0;
    this.spreadFlip = !this.spreadFlip;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI / 2 - spread / 2 + i * step + offset;
      this.scene.fireEnemyBullet(this.x, this.y + 50, angle, BOSS.spreadSpeed);
    }
    audio.play('enemyShoot');
  }

  /** Padrão MIRA: os dois canhões atiram na direção atual do jogador. */
  fireAimed() {
    const { player } = this.scene;
    if (!player.active) return;
    for (const side of [-64, 64]) {
      const x = this.x + side;
      const y = this.y + 42;
      const angle = Phaser.Math.Angle.Between(x, y, player.x, player.y);
      this.scene.fireEnemyBullet(x, y, angle, BOSS.aimedSpeed);
    }
    audio.play('enemyShoot');
  }

  /** Aplica dano; retorna true se o chefe morreu com este acerto. */
  takeHit(damage = 1) {
    if (!this.isVulnerable()) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.state !== BOSS_STATES.DYING) this.clearTint();
    });
    this.scene.events.emit('boss-health', this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  /** Sequência de explosões e, no fim, avisa o GameScene da vitória. */
  die() {
    this.setState(BOSS_STATES.DYING);
    this.disableBody(false, false);
    this.setTint(0xff8080);
    const { scene } = this;

    scene.time.addEvent({
      delay: 140,
      repeat: 11,
      callback: () => {
        const colors = [COLORS.purple, COLORS.magenta, COLORS.orange];
        scene.effects.explosion(this.x + randomOffset(90), this.y + randomOffset(40), Phaser.Utils.Array.GetRandom(colors), 18, 3);
        scene.cameras.main.shake(120, 0.006);
        audio.play('explosion');
      },
    });
    scene.time.delayedCall(1800, () => {
      scene.effects.explosion(this.x, this.y, COLORS.white, 80, 9);
      scene.effects.explosion(this.x, this.y, COLORS.magenta, 50, 6);
      scene.cameras.main.shake(600, 0.02);
      scene.cameras.main.flash(300, 255, 255, 255);
      audio.play('bigExplosion');
      this.setVisible(false);
      scene.onBossDefeated();
    });
  }
}
