// Le build du camp : un site statique dans dist/, qui marche depuis n'importe quel dossier (base './').
// Une erreur de syntaxe fait échouer le build : rien ne part en ligne à moitié cassé.
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// La liste des musiques déposées dans public/assets/musique/ (src/audio/pistes.js) : le jeu ne demande que les fichiers
// qui existent, donc une piste absente ne fait pas d'erreur 404 en console.
function musiques() {
  const id = 'virtual:musique', dossier = path.resolve('public/assets/musique');
  return {
    name: 'musiques-du-jeu',
    resolveId: (s) => (s === id ? `\0${id}` : null),
    load(s) {
      if (s !== `\0${id}`) return null;
      let liste = [];
      try { liste = fs.readdirSync(dossier).filter((f) => /\.(mp3|ogg|m4a|aac|wav|flac)$/i.test(f)); } catch {}
      return `export default ${JSON.stringify(liste)};`;
    },
  };
}

const tampon = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });

export default defineConfig({
  base: './',
  plugins: [musiques()],
  define: { __BUILD_STAMP__: JSON.stringify(tampon) },
  // cinq pages : le camp, le terrain d'entraînement, l'armurerie (le créateur de classe), les archives et l'atelier des niveaux, où l'on entre depuis le camp
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, target: 'es2022', chunkSizeWarningLimit: 900,
    rollupOptions: { input: { camp: 'index.html', entrainement: 'entrainement.html', classe: 'classe.html', archives: 'archives.html', niveaux: 'niveaux.html' } } },
  server: { port: 5173 },
});
