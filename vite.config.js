import { defineConfig } from 'vite';

// O GitHub Pages publica o site em https://<usuario>.github.io/orbita-zero/,
// então no build os arquivos precisam ser referenciados a partir de /orbita-zero/.
// O `npm run preview` serve o build, então usa o mesmo caminho.
// Em desenvolvimento (npm run dev) usamos a raiz "/" para facilitar.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/orbita-zero/' : '/',
  build: {
    // O Phaser sozinho tem ~1,2 MB minificado. Isso é esperado para uma engine
    // completa, então aumentamos o limite do aviso de "chunk grande".
    chunkSizeWarningLimit: 1600,
  },
}));
