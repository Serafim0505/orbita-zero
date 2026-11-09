import { test, expect } from '@playwright/test';

// =============================================================================
// Teste de fumaça (smoke test): abre o jogo de verdade num navegador e
// verifica o fluxo completo de cenas, sem erros no console.
// Usa o gancho window.__ORBITA__, que só existe com ?debug=1 na URL.
// Screenshots: docs/screenshots (build local) ou test-results (site publicado).
// =============================================================================

const SHOTS_DIR = process.env.BASE_URL ? 'test-results/screenshots-online' : 'docs/screenshots';

const activeScenes = (page) => page.evaluate(() => window.__ORBITA__.activeScenes());

async function waitForScene(page, key, timeout = 15_000) {
  await page.waitForFunction((k) => window.__ORBITA__?.activeScenes().includes(k), key, { timeout });
}

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png` });
}

test('fluxo completo: menu → jogo → pausa → game over → chefe → vitória → menu', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  // 1) Menu
  await page.goto('./?debug=1');
  await waitForScene(page, 'MenuScene');
  await page.waitForTimeout(900);
  await shot(page, 'menu');

  // 2) ENTER inicia o jogo: GameScene + UIScene rodando em paralelo
  await page.keyboard.press('Enter');
  await waitForScene(page, 'GameScene');
  await waitForScene(page, 'UIScene');
  expect(await activeScenes(page)).not.toContain('MenuScene');

  // 3) Pausa (P) e retomada (P)
  await page.waitForTimeout(800);
  await page.keyboard.press('p');
  await waitForScene(page, 'PauseScene');
  expect(await page.evaluate(() => window.__ORBITA__.isPaused('GameScene'))).toBe(true);
  await shot(page, 'pause');
  await page.keyboard.press('p');
  await page.waitForFunction(() => !window.__ORBITA__.activeScenes().includes('PauseScene'));
  await waitForScene(page, 'GameScene');

  // 4) ~20 s de jogo simulado: segura Espaço (tiro) e alterna direções
  // O screenshot de gameplay é tirado quando há vários inimigos na tela e já há pontos.
  const moves = ['ArrowLeft', 'KeyD', 'ArrowRight', 'KeyA', 'ArrowUp', 'KeyS'];
  let gameplayShot = false;
  await page.keyboard.down('Space');
  for (let i = 0; i < 40; i += 1) {
    const key = moves[Math.floor(i / 2) % moves.length];
    if (i % 2 === 0) await page.keyboard.down(key);
    await page.waitForTimeout(500);
    if (i % 2 === 1) await page.keyboard.up(key);
    const inGame = (await activeScenes(page)).includes('GameScene');
    const busy = inGame && (await page.evaluate(() => window.__ORBITA__.enemies() >= 3 && window.__ORBITA__.score() >= 200));
    if (!gameplayShot && i >= 16 && (busy || (inGame && i === 39))) {
      await shot(page, 'gameplay');
      gameplayShot = true;
    }
  }
  await page.keyboard.up('Space');
  expect(gameplayShot || (await activeScenes(page)).includes('GameOverScene')).toBe(true);

  const scenesAfterPlay = await activeScenes(page);
  const diedNaturally = scenesAfterPlay.includes('GameOverScene');
  if (!diedNaturally) {
    expect(scenesAfterPlay).toContain('GameScene');
    // Atirou durante 20 s: precisa ter pontuado.
    expect(await page.evaluate(() => window.__ORBITA__.score())).toBeGreaterThan(0);
    // 5) Força o game over pelo gancho de depuração
    await page.evaluate(() => window.__ORBITA__.forceGameOver());
  }

  await waitForScene(page, 'GameOverScene');
  const afterGameOver = await activeScenes(page);
  expect(afterGameOver).not.toContain('GameScene');
  expect(afterGameOver).not.toContain('UIScene');
  await page.waitForTimeout(1300); // espera a contagem animada dos pontos
  await shot(page, 'gameover');

  // 6) ENTER joga de novo: partida nova com pontuação zerada e 3 vidas
  await page.keyboard.press('Enter');
  await waitForScene(page, 'GameScene');
  await waitForScene(page, 'UIScene');
  expect(await page.evaluate(() => window.__ORBITA__.score())).toBe(0);
  expect(await page.evaluate(() => window.__ORBITA__.lives())).toBe(3);

  // 7) Pula para o chefe e confere o estado BOSS
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__ORBITA__.skipToBoss());
  await page.waitForFunction(() => window.__ORBITA__.gameState() === 'BOSS', null, { timeout: 10_000 });
  await page.keyboard.down('Space');
  await page.waitForTimeout(3500);
  await page.keyboard.up('Space');
  await shot(page, 'boss');

  // 8) Vitória
  await page.evaluate(() => window.__ORBITA__.forceVictory());
  await waitForScene(page, 'VictoryScene');
  await page.waitForTimeout(1500);
  await shot(page, 'victory');

  // 9) M volta ao menu
  await page.keyboard.press('m');
  await waitForScene(page, 'MenuScene');
  expect(await activeScenes(page)).toEqual(['MenuScene']);

  expect(errors, errors.join('\n')).toEqual([]);
});
