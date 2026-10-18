// Le build du camp : un site statique dans dist/, qui marche depuis n'importe quel dossier (base './').
// Une erreur de syntaxe fait échouer le build : rien ne part en ligne à moitié cassé.
import { defineConfig } from 'vite';

const tampon = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });

export default defineConfig({
  base: './',
  define: { __BUILD_STAMP__: JSON.stringify(tampon) },
  // trois pages : le camp, le terrain d'entraînement et l'armurerie (le créateur de classe), où l'on entre depuis le camp
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, target: 'es2022', chunkSizeWarningLimit: 900,
    rollupOptions: { input: { camp: 'index.html', entrainement: 'entrainement.html', classe: 'classe.html' } } },
  server: { port: 5173 },
});
