// L'entrée d'un niveau de l'aventure : l'hôte choisit quel héros lance le dé (décidé le 22 oct : pas de vote), puis ce
// héros lance un d20 devant tout le monde ; le lancer donne la graine, un mot de 5 lettres, d'où l'on tire la salle
// (aventure.js). Jamais automatique : tant que l'hôte n'a choisi personne, rien ne part.
//   La promesse rend { qui: l'index du héros, mot, de } ; `api` sert aux tests.
import { motAleatoire, deDeLaGraine } from './aventure.js';

const el = (tag, attrs = {}, ...enfants) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v); }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
};

export const api = { ouvert: false, choisir: null, lancer: null, etat: () => null };

export function demanderLancer({ titre, noms, alea = Math.random }) {
  return new Promise((resolve) => {
    let choisi = -1, fini = false;
    const consigne = el('p', { class: 'entree-consigne' });
    const de = el('div', { class: 'entree-de', hidden: true });
    const boutons = noms.map((nom, k) => el('button', { type: 'button', class: 'entree-heros', 'data-heros': String(k), onclick: () => choisir(k) }, el('strong', {}, nom)));
    const lancer = el('button', { type: 'button', class: 'entree-lancer', hidden: true, onclick: () => jeter() }, 'Lancer le dé');
    const boite = el('section', { class: 'entree-terrain plaque', role: 'dialog', 'aria-label': 'Qui lance le dé ?' },
      el('h2', {}, titre), el('p', { class: 'entree-question' }, 'Qui lance le dé ?'),
      el('div', { class: 'entree-choix' }, boutons), consigne, lancer, de);
    const fond = el('div', { class: 'entree-fond' }, boite);
    document.body.append(fond);
    api.ouvert = true;

    function maj() {
      boutons.forEach((b, k) => b.classList.toggle('choisi', k === choisi));
      consigne.textContent = choisi < 0 ? 'L’hôte choisit le héros qui lance le dé.' : `${noms[choisi]} lancera le dé.`;
      lancer.hidden = choisi < 0 || fini;
      if (choisi >= 0) lancer.textContent = `${noms[choisi]} lance le dé`;
    }
    function choisir(k) { if (!fini) { choisi = k; maj(); } }
    function jeter() {
      if (fini || choisi < 0) return;
      fini = true; lancer.hidden = true; boutons.forEach((b) => { b.disabled = true; });
      const mot = motAleatoire(alea), final = deDeLaGraine(mot), qui = choisi;
      de.hidden = false;
      let n = 0;
      const tourne = setInterval(() => { de.replaceChildren(el('span', { class: 'entree-face' }, String(1 + Math.floor(Math.random() * 20)))); if (++n > 10) { clearInterval(tourne); fin(); } }, 80);
      function fin() {
        de.replaceChildren(el('span', { class: 'entree-face final' }, String(final)), el('p', { class: 'entree-graine' }, `${noms[qui]} a lancé : graine ${mot}`));
        setTimeout(() => { fond.remove(); api.ouvert = false; resolve({ qui, mot, de: final }); }, 1500);
      }
    }
    Object.assign(api, { choisir, lancer: jeter, etat: () => ({ choisi }) });
    maj();
  });
}
