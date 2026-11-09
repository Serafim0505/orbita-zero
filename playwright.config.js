import { defineConfig, devices } from '@playwright/test';

// Por padrão o teste sobe o build local (vite preview).
// Para testar o site publicado:  BASE_URL=https://.../orbita-zero/ npx playwright test
const remoteUrl = process.env.BASE_URL;
const localUrl = 'http://localhost:4173/orbita-zero/';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: remoteUrl || localUrl,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 960, height: 540 } },
    },
  ],
  webServer: remoteUrl
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
