// L'éditeur de classe, en bois et parchemin comme le camp : à gauche les onglets de la fiche (identité, caractéristiques,
// points de classe, capacités, faiblesse et niveaux, look, fiche, cadre), à droite l'aperçu du build qui se met à jour à
// chaque changement (PV, distance, modificateurs, dégâts de chaque capacité, ce qui bloque et ce qui se discute).
// Tout le calcul est dans budget.js ; ici on affiche, on saisit, on enregistre (ce navigateur), on exporte et on importe.
// L'onglet Cadre montre le cadre du jeu (cadre.json) et laisse le retoucher : les chiffres changés s'appliquent tout de
// suite à l'aperçu et se gardent dans ce navigateur, pour proposer un changement du cadre au groupe (copier le JSON).
import {
  CARACS, classeVide, capaciteVide, fiche, verifier, degats, ficheTexte, accroches, normaliser, identifiant, signe, metres, coutCapacite, coutPv, coutVitesse,
} from './budget.js';

export const name = 'editeur';
export const always = true;

const RETOUR_CAMP = './index.html?spot=classes';
const CLE_CLASSES = 'dungeoncoop:classes', CLE_COURANTE = 'dungeoncoop:classe-courante', CLE_CADRE = 'dungeoncoop:cadre';
// les planches LPC déjà dans le jeu, pour un portrait d'essai (le vrai look vient du générateur LPC, lpc-sprite-mods)
export const BASES = ['brute', 'mage', 'voleur', 'gardien', 'eclaireuse', 'chevalier', 'druide', 'barde', 'baba-brisenclume'];
const ARCHETYPES = ['Fighter', 'Support', 'Ranged', 'Mage'];
const ONGLETS = [
  ['identite', 'Identité'], ['caracs', 'Caractéristiques'], ['points', 'Points de classe'], ['capacites', 'Capacités'],
  ['faiblesse', 'Faiblesse et niveaux'], ['look', 'Look'], ['fiche', 'Fiche'], ['cadre', 'Le cadre'],
];

const el = (tag, attrs = {}, ...enfants) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'dataset') Object.assign(n.dataset, v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const fr = (n) => String(n).replace('.', ',');     // 10,5 m, pas 10.5
const lire = (cle) => { try { return JSON.parse(localStorage.getItem(cle)); } catch { return null; } };
const ecrire = (cle, v) => { try { if (v == null) localStorage.removeItem(cle); else localStorage.setItem(cle, JSON.stringify(v)); } catch { /* navigation privée : tant pis */ } };

let game, cadreBase, cadre, exemples, classe, onglet = 'identite', portraits = {};
const dom = {};

export function init(g, options) {
  game = g;
  cadreBase = options.cadre;
  exemples = options.exemples ?? {};
  cadre = fusionnerCadre(cadreBase, lire(CLE_CADRE));
  // la classe ouverte : ?classe=exemple, sinon la dernière de ce navigateur, sinon une fiche vide
  const sauvees = lire(CLE_CLASSES) ?? {}, courante = lire(CLE_COURANTE);
  if (options.ouvrir && exemples[options.ouvrir]) classe = normaliser(clone(exemples[options.ouvrir]), cadre);
  else if (courante && sauvees[courante]) classe = normaliser(sauvees[courante], cadre);
  else classe = classeVide(cadre);
  construire();
  dessiner();
  return api;
}
export function update() {}
export function dispose() { dom.racine?.remove(); }

// Le cadre retouché dans ce navigateur, posé sur le cadre du jeu (seuls les chiffres se retouchent : les listes restent).
function fusionnerCadre(base, perso) {
  const c = clone(base);
  if (!perso || typeof perso !== 'object') return c;
  const poser = (cible, source) => {
    for (const [k, v] of Object.entries(source)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && cible[k] && typeof cible[k] === 'object') poser(cible[k], v);
      else if (Array.isArray(v) && Array.isArray(cible[k])) v.forEach((x, i) => { if (cible[k][i] && typeof x === 'object') poser(cible[k][i], x); else if (cible[k][i] !== undefined) cible[k][i] = x; });
      else if (k in cible) cible[k] = v;
    }
  };
  poser(c, perso);
  return c;
}
const cadreModifie = () => JSON.stringify(cadre) !== JSON.stringify(cadreBase);

// --- La page ----------------------------------------------------------------------------------------------------
function construire() {
  dom.titre = el('strong', { class: 'titre-armurerie' }, 'L’armurerie : créer sa classe');
  dom.badgeCadre = el('button', { type: 'button', class: 'badge-cadre', title: 'Le cadre du jeu (CLASS_FRAMEWORK.fr.md) : onglet Cadre', onclick: () => montrer('cadre') });
  dom.mesClasses = el('select', { class: 'choix', 'aria-label': 'Mes classes', onchange: (e) => { if (e.target.value) ouvrirSauvee(e.target.value); } });
  dom.exemples = el('select', { class: 'choix', 'aria-label': 'Ouvrir un exemple', onchange: (e) => { if (e.target.value) ouvrirExemple(e.target.value); e.target.value = ''; } },
    el('option', { value: '' }, 'Ouvrir un exemple…'), ...Object.values(exemples).map((c) => el('option', { value: c.id }, c.nom)));
  dom.fichier = el('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e) => { const f = e.target.files[0]; if (f) importer(await f.text()); e.target.value = ''; } });
  dom.haut = el('header', { class: 'haut-armurerie plaque' },
    dom.titre, dom.badgeCadre,
    el('span', { class: 'outils' },
      dom.mesClasses, dom.exemples,
      el('button', { type: 'button', class: 'bouton-jeu discret', id: 'nouvelle', onclick: nouvelle }, 'Nouvelle'),
      el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => dom.fichier.click() }, 'Importer…'),
      el('button', { type: 'button', class: 'bouton-jeu discret', id: 'exporter', onclick: exporter }, 'Exporter le JSON'),
      el('button', { type: 'button', class: 'bouton-jeu', id: 'enregistrer', onclick: () => { enregistrer(); signaler('Enregistrée dans ce navigateur.'); } }, 'Enregistrer'),
      el('a', { class: 'bouton-jeu discret', href: RETOUR_CAMP }, 'Retour au camp')),
    dom.fichier);
  dom.onglets = el('nav', { class: 'onglets-armurerie', 'aria-label': 'Les parties de la fiche' },
    ...ONGLETS.map(([id, titre]) => el('button', { type: 'button', class: 'onglet', dataset: { onglet: id }, onclick: () => montrer(id) }, titre, el('span', { class: 'pastille', hidden: true }))));
  dom.page = el('section', { class: 'page-armurerie plaque', 'aria-live': 'polite' });
  dom.apercu = el('aside', { class: 'apercu-armurerie plaque', 'aria-label': 'L’aperçu du build' });
  dom.signal = el('p', { class: 'signal-armurerie', hidden: true, 'aria-live': 'polite' });
  dom.racine = el('div', { class: 'armurerie' }, dom.haut, el('div', { class: 'corps-armurerie' }, el('div', { class: 'gauche-armurerie' }, dom.onglets, dom.page), dom.apercu), dom.signal);
  document.body.append(dom.racine);
}

function montrer(id) { onglet = id; dessiner(); dom.page.scrollTop = 0; }
let minuteur;
function signaler(texte) { dom.signal.textContent = texte; dom.signal.hidden = false; clearTimeout(minuteur); minuteur = setTimeout(() => { dom.signal.hidden = true; }, 2200); }

// Un changement de la classe : on garde, on redessine l'aperçu ; `structure` redessine aussi l'onglet (listes, sortes).
function changer(f, structure = false) {
  f(classe);
  enregistrer(true);
  if (structure) dessinerOnglet();
  dessinerApercu();
  dessinerPastilles();
}
function dessiner() { dessinerOnglet(); dessinerApercu(); dessinerPastilles(); dessinerTete(); }
function dessinerTete() {
  const sauvees = lire(CLE_CLASSES) ?? {};
  dom.mesClasses.replaceChildren(el('option', { value: '' }, Object.keys(sauvees).length ? 'Mes classes…' : 'Mes classes (aucune)'),
    ...Object.values(sauvees).map((c) => el('option', { value: c.id, selected: c.id === classe.id }, c.nom || c.id)));
  dom.badgeCadre.textContent = cadreModifie() ? 'cadre modifié ici' : 'le cadre du jeu';
  dom.badgeCadre.classList.toggle('modifie', cadreModifie());
}
function dessinerPastilles() {
  const V = verifier(classe, cadre);
  for (const b of dom.onglets.querySelectorAll('.onglet')) {
    const id = b.dataset.onglet, n = V.problemes.filter((p) => p.ou === id).length;
    b.classList.toggle('actif', id === onglet);
    const p = b.querySelector('.pastille'); p.hidden = !n; p.textContent = n;
  }
}

// --- Les onglets --------------------------------------------------------------------------------------------------
const champ = (label, input, aide) => el('label', { class: 'champ' }, el('span', { class: 'etiquette-champ' }, label), input, aide ? el('small', { class: 'muet' }, aide) : null);
const texte = (valeur, surChangement, attrs = {}) => el('input', { type: 'text', value: valeur ?? '', oninput: (e) => surChangement(e.target.value), ...attrs });
const zone = (valeur, surChangement, attrs = {}) => el('textarea', { rows: 2, oninput: (e) => surChangement(e.target.value), ...attrs }, valeur ?? '');
const choix = (valeur, options, surChangement, attrs = {}) => el('select', { onchange: (e) => surChangement(e.target.value), ...attrs },
  ...options.map(([v, t]) => el('option', { value: v, selected: String(v) === String(valeur) }, t)));
// un compteur −/+ borné
const compteur = (valeur, min, max, pas, surChangement, attrs = {}) => el('span', { class: 'compteur', ...attrs },
  el('button', { type: 'button', class: 'moins', 'aria-label': 'moins', disabled: valeur - pas < min, onclick: () => surChangement(valeur - pas) }, '−'),
  el('output', {}, valeur),
  el('button', { type: 'button', class: 'plus', 'aria-label': 'plus', disabled: valeur + pas > max, onclick: () => surChangement(valeur + pas) }, '+'));

function dessinerOnglet() {
  const pages = { identite, caracs, points, capacites, faiblesse, look, fichePage, cadrePage };
  const f = pages[onglet === 'fiche' ? 'fichePage' : onglet === 'cadre' ? 'cadrePage' : onglet];
  dom.page.replaceChildren(...[f()].flat());
}

function identite() {
  return [
    el('h2', {}, '1. Qui est cette classe ?'),
    champ('Nom', texte(classe.nom, (v) => changer((c) => { c.nom = v; c.id = identifiant(v); }), { id: 'nom', placeholder: 'Le nom de la classe' })),
    champ('Ton pseudo (l’auteur)', texte(classe.auteur, (v) => changer((c) => { c.auteur = v; }), { placeholder: 'qui la conçoit : elle est à toi' })),
    champ('En une phrase, qui est-elle ?', zone(classe.phrase, (v) => changer((c) => { c.phrase = v; }), { placeholder: 'ex. « Elle court plus vite que tout le monde, entrave une cible de loin et la finit d’un tir lesté. »' })),
    el('div', { class: 'deux' },
      champ('Rôle principal', choix(classe.role, [['', '— choisir —'], ...cadre.roles.map((r) => [r.id, r.nom])], (v) => changer((c) => { c.role = v; }, true), { id: 'role' }),
        cadre.roles.find((r) => r.id === classe.role)?.conseil),
      champ('La particularité (le « twist »)', texte(classe.twist, (v) => changer((c) => { c.twist = v; }), { placeholder: 'ex. « soutien qui se bat au contact »' }), 'ce qui fait que la classe n’est pas que son rôle')),
    el('div', { class: 'deux' },
      champ('Archétype d’histoire', choix(classe.archetype, [['', '— plus tard —'], ...ARCHETYPES.map((a) => [a, a])], (v) => changer((c) => { c.archetype = v; })), 'l’histoire parle à ton héros à travers lui (STORY_STRUCTURE §4, en cours)'),
      champ('Ressource', choix(classe.ressource, [['', '— choisir —'], ...cadre.ressources.map((r) => [r.id, r.nom])], (v) => changer((c) => { c.ressource = v; }, true), { id: 'ressource' }),
        (() => { const r = cadre.ressources.find((x) => x.id === classe.ressource); return r ? `${r.remplit} · max ${r.max}` : 'la liste commune : une nouvelle ressource, c’est avec l’accord du groupe'; })())),
    el('p', { class: 'muet' }, 'Aucun équipement de départ : tout se trouve en jeu. La classe est au niveau 1 ; les niveaux 2 à 20 viennent plus tard (onglet Faiblesse et niveaux).'),
  ];
}

function caracs() {
  const F = fiche(classe, cadre), C = cadre.caracs;
  const couts = Object.entries(C.couts).map(([s, p]) => `${s} = ${p}`).join(', ');
  return [
    el('h2', {}, `2. Les six caractéristiques (${F.caracs.depense}/${F.caracs.total} points)`),
    el('p', { class: 'muet' }, `L’achat de la 5e : chaque caractéristique part de ${C.base}. Monter coûte : ${couts}. Rien au-dessus de ${C.max} au niveau 1. Modificateur = (score − 10) ÷ 2, arrondi en dessous.`),
    el('table', { class: 'table-caracs' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Carac.'), el('th', {}, 'Score'), el('th', {}, 'Mod.'), el('th', {}, 'Coût'), el('th', {}, 'Ce qu’elle fait ici'))),
      el('tbody', {}, ...C.liste.map((k) => {
        const d = F.caracs.details.find((x) => x.id === k.id);
        return el('tr', { dataset: { carac: k.id } },
          el('th', {}, el('abbr', { title: k.nom }, k.id)),
          el('td', {}, compteur(d.score, C.min, C.max, 1, (v) => changer((c) => { c.caracs[k.id] = v; }, true), { dataset: { compteur: k.id } })),
          el('td', { class: d.mod < 0 ? 'negatif' : d.mod > 0 ? 'positif' : '' }, signe(d.mod)),
          el('td', {}, d.cout),
          el('td', { class: 'muet' }, k.effet));
      }))),
    el('p', { class: F.caracs.reste < 0 ? 'probleme' : F.caracs.reste > 0 ? 'conseil' : 'ok' },
      F.caracs.reste < 0 ? `${-F.caracs.reste} point(s) de trop.` : F.caracs.reste > 0 ? `Il reste ${F.caracs.reste} point(s) à placer.` : 'Les 27 points sont placés.'),
  ];
}

function points() {
  const F = fiche(classe, cadre), P = cadre.pointsClasse, B = F.classe;
  const ligne = (quoi, cout) => el('tr', {}, el('td', {}, quoi), el('td', { class: cout < 0 ? 'positif' : '' }, cout > 0 ? `${cout}` : cout < 0 ? `rend ${-cout}` : '0'));
  return [
    el('h2', {}, `3. Les points de classe (${B.depense}/${B.total})`),
    el('p', { class: 'muet' }, `${P.total} points à dépenser librement entre les PV, le déplacement et les capacités. Ce qui reste devient +${P.pvParPointRestant} PV par point (hors plafond).`),
    el('div', { class: 'deux' },
      champ(`PV de base (${P.pvMin} à ${P.pvMax})`, compteur(F.pvBase, P.pvMin, P.pvMax, P.pvPas, (v) => changer((c) => { c.pv = v; }, true), { id: 'pv' }),
        `+${P.pvPas} PV = ${P.pvCoutHausse} point ; −${P.pvPas} PV rend ${P.pvRenduBaisse} point`),
      champ(`Déplacement, en cases (${P.vitesseMin} à ${P.vitesseMax})`, compteur(F.vitesse, P.vitesseMin, P.vitesseMax, 1, (v) => changer((c) => { c.vitesse = v; }, true), { id: 'vitesse' }),
        `une case = ${fr(P.metresParCase)} m, soit ${fr(F.metres)} m par tour · +1 case = ${P.vitesseCoutHausse} points ; −1 case rend ${P.vitesseRenduBaisse}`)),
    el('table', { class: 'table-points' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Dépense'), el('th', {}, 'Points'))),
      el('tbody', {},
        ligne(`PV de base ${F.pvBase}`, B.pv),
        ligne(`Déplacement ${F.vitesse} cases (${F.metres} m)`, B.vitesse),
        ...(classe.capacites ?? []).map((c, k) => {
          const d = coutCapacite(c, cadre), s = cadre.capacites.sortes.find((x) => x.id === c.sorte);
          return ligne(`${c.nom || `Capacité ${k + 1}`} : ${s?.nom ?? c.sorte}${d.renforts ? ` + renforts ${d.renforts}` : ''}`, d.total);
        }),
        el('tr', { class: 'total' }, el('td', {}, 'Total'), el('td', {}, `${B.depense} / ${B.total}`)),
        el('tr', {}, el('td', {}, B.reste >= 0 ? `Reste : ${B.reste} point(s) → +${F.bonusReste} PV` : 'Trop dépensé'), el('td', { class: B.reste < 0 ? 'negatif' : '' }, B.reste)))),
    el('p', { class: 'ok' }, `PV finaux : ${F.pvBase} ${F.bonusCon ? `${signe(F.bonusCon)} (CON) ` : ''}${F.bonusReste ? `+ ${F.bonusReste} (points restants) ` : ''}= `, el('strong', {}, `${F.pv} PV`), ` · `, el('strong', {}, `${fr(F.metres)} m`), ' par tour.'),
  ];
}

function capacites() {
  const A = accroches(cadre), caps = classe.capacites ?? [];
  const cocher = (cap, cle, id, nom) => el('label', { class: 'coche' }, el('input', { type: 'checkbox', checked: (cap[cle] ?? []).includes(id),
    onchange: (e) => changer((c) => { const cc = c.capacites[caps.indexOf(cap)]; cc[cle] = e.target.checked ? [...new Set([...(cc[cle] ?? []), id])] : (cc[cle] ?? []).filter((x) => x !== id); }, true) }), nom);
  const carte = (cap, k) => {
    const s = cadre.capacites.sortes.find((x) => x.id === cap.sorte), d = degats(cap, classe, cadre), cout = coutCapacite(cap, cadre);
    return el('article', { class: 'capacite-fiche', dataset: { capacite: k } },
      el('header', {}, el('strong', {}, `Capacité ${k + 1}`), el('span', { class: 'points-cap' }, `${cout.total} pt${cout.total > 1 ? 's' : ''}`),
        el('button', { type: 'button', class: 'bouton-jeu discret petit', 'aria-label': `retirer la capacité ${k + 1}`, onclick: () => changer((c) => { c.capacites.splice(k, 1); }, true) }, 'Retirer')),
      el('div', { class: 'deux' },
        champ('Nom', texte(cap.nom, (v) => changer((c) => { c.capacites[k].nom = v; }), { placeholder: 'ex. Fiole d’huile', dataset: { champ: 'nom' } })),
        champ('Sorte', choix(cap.sorte, cadre.capacites.sortes.map((x) => [x.id, `${x.nom} (${x.cout} pt${x.cout > 1 ? 's' : ''})`]),
          (v) => changer((c) => { const x = cadre.capacites.sortes.find((y) => y.id === v); c.capacites[k].sorte = v; if (x) c.capacites[k].slot = x.slot; }, true), { dataset: { champ: 'sorte' } }), s?.note)),
      el('div', { class: 'quatre' },
        champ('Moment', choix(cap.slot, cadre.capacites.slots.map((x) => [x.id, x.nom]), (v) => changer((c) => { c.capacites[k].slot = v; }, true))),
        champ('Portée', choix(cap.portee, cadre.paliers.portees.map((x) => [x.id, `${x.nom} (${fr(x.m)} m)`]), (v) => changer((c) => { c.capacites[k].portee = v; }))),
        champ('Zone', choix(cap.zone, cadre.paliers.zones.map((x) => [x.id, x.rayon ? `${x.nom}, ${fr(x.rayon)} m` : x.nom]), (v) => changer((c) => { c.capacites[k].zone = v; }))),
        champ('Caractéristique', choix(cap.carac, CARACS.map((x) => [x, x]), (v) => changer((c) => { c.capacites[k].carac = v; }, true)))),
      el('div', { class: 'deux' },
        champ('Coût en ressource', texte(cap.cout, (v) => changer((c) => { c.capacites[k].cout = v; }), { placeholder: 'ex. 2 Concentration, 15 Mana, aucun' })),
        champ('Dégâts', el('output', { class: 'degats' }, d ? `${d.base} + d${d.de} ${signe(d.mod)} : ${d.texte}` : 'pas de jet de dégâts'),
          d ? `palier ${d.palier} · éraflure / touche / critique, avec ${cap.carac} ${signe(d.mod)}` : 'un soin, un statut, une surface ou une position')),
      champ('Ce qu’elle fait', zone(cap.effet, (v) => changer((c) => { c.capacites[k].effet = v; }), { placeholder: 'en une phrase : la cible est À terre ; une flaque de 2,5 m ; +10 PV à chaque allié…' })),
      el('div', { class: 'deux' },
        el('fieldset', { class: 'accroches' }, el('legend', {}, 'Crée (le lien de combo qu’elle pose)'), ...A.map((a) => cocher(cap, 'cree', a.id, a.nom))),
        el('fieldset', { class: 'accroches' }, el('legend', {}, 'Utilise (ce qu’elle exploite)'), ...A.map((a) => cocher(cap, 'utilise', a.id, a.nom)))),
      el('fieldset', { class: 'accroches renforts' }, el('legend', {}, 'Renforts'), ...cadre.capacites.renforts.map((r) => cocher(cap, 'renforts', r.id, `${r.nom} (+${r.cout})`))));
  };
  return [
    el('h2', {}, `4. Les capacités de départ (${caps.length}/${cadre.capacites.nombre}, dont l’attaque de base)`),
    el('p', { class: 'muet' }, 'Chaque capacité dit ce qu’elle crée ou ce qu’elle utilise : c’est ce qui fait un combo entre deux joueurs, le cœur du jeu. Les dégâts suivent les paliers du cadre : T1 (8 + d4) pour l’attaque de base, T2 (14 + d6) pour une exploitation.'),
    ...caps.map(carte),
    el('div', { class: 'boutons' }, ...cadre.capacites.sortes.filter((s) => s.id !== 'base' || !caps.some((c) => c.sorte === 'base')).map((s) =>
      el('button', { type: 'button', class: 'bouton-jeu discret', dataset: { ajouter: s.id }, onclick: () => changer((c) => { c.capacites.push(capaciteVide(cadre, s.id)); }, true) }, `+ ${s.nom}`))),
  ];
}

function faiblesse() {
  const N = cadre.niveaux;
  return [
    el('h2', {}, '5. La faiblesse (obligatoire)'),
    champ('Un vrai défaut, que les ennemis ou la salle peuvent exploiter', zone(classe.faiblesse, (v) => changer((c) => { c.faiblesse = v; }), { id: 'faiblesse', placeholder: cadre.faiblessesExemples[0] })),
    el('p', { class: 'muet' }, 'Des exemples : ', cadre.faiblessesExemples.map((f, i) => [i ? ' · ' : '', el('button', { type: 'button', class: 'lien', onclick: () => changer((c) => { c.faiblesse = f; }, true) }, f)])),
    el('h2', {}, '6. Les niveaux (plus tard, mais note l’idée)'),
    el('p', { class: 'muet' }, `De 1 à ${N.max} : +${N.pvParNiveau} PV et le modificateur de CON à chaque niveau ; une capacité nouvelle aux niveaux ${N.nouvelleCapacite.join(', ')} ; +2 à une caractéristique (ou +1 à deux, max ${N.caracMax}) aux niveaux ${N.ameliorationCarac.join(', ')} ; un coup d’équipe avec une autre classe au ${N.coupEquipe} ; la signature au ${N.signature}.`),
    el('h3', {}, `La sous-classe au niveau ${N.sousClasse} : ${N.cheminsSousClasse} chemins (paliers ${N.paliersSousClasse.join(', ')})`),
    ...(classe.sousClasses ?? []).map((s, k) => el('div', { class: 'deux' },
      champ(`Chemin ${'AB'[k]} : nom`, texte(s.nom, (v) => changer((c) => { c.sousClasses[k].nom = v; }), { placeholder: k ? 'ex. Ombre' : 'ex. Incendiaire' })),
      champ('L’idée', texte(s.idee, (v) => changer((c) => { c.sousClasses[k].idee = v; }), { placeholder: k ? 'passe à travers les ennemis' : 'de plus grands feux' })))),
    el('h2', {}, '7. Références et clins d’œil'),
    champ('Ce qui t’a inspiré, les blagues de l’équipe à y mettre', zone(classe.references, (v) => changer((c) => { c.references = v; }))),
  ];
}

function look() {
  const L = classe.look ?? {};
  return [
    el('h2', {}, '8. Le look (pour le sprite LPC)'),
    el('p', { class: 'muet' }, 'Le vrai sprite se fait dans le générateur LPC, puis dans Sprite Painter (le skill lpc-sprite-mods) : horns, cicatrice, plume, emblème. Ici, on décrit, on colle le lien du générateur, et on choisit une planche d’essai pour l’aperçu.'),
    el('div', { class: 'deux' },
      champ('Corps et carrure', texte(L.corps, (v) => changer((c) => { c.look.corps = v; }), { placeholder: 'ex. une femme, teint olive, mince' })),
      champ('Tenue et couleurs (avant tout butin)', texte(L.tenue, (v) => changer((c) => { c.look.tenue = v; }), { placeholder: 'ex. capuche verte, bottes noires' }))),
    el('div', { class: 'deux' },
      champ('La touche qui la rend unique', texte(L.touche, (v) => changer((c) => { c.look.touche = v; }), { placeholder: 'des cornes, une cicatrice, une crête, un emblème' })),
      champ('Le lien du générateur LPC', texte(L.lien, (v) => changer((c) => { c.look.lien = v; }), { placeholder: 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/#…' }),
        el('a', { href: 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/', target: '_blank', rel: 'noopener' }, 'ouvrir le générateur'))),
    champ('Planche d’essai pour l’aperçu', choix(L.base, [['', '— aucune —'], ...BASES.map((b) => [b, b])], (v) => changer((c) => { c.look.base = v; }, true), { id: 'base' }), 'une des planches déjà dans le jeu, en attendant la tienne'),
    L.base ? el('div', { class: 'portrait-grand' }, portrait(L.base, 128)) : null,
  ];
}

function fichePage() {
  const t = ficheTexte(classe, cadre);
  return [
    el('h2', {}, 'La fiche, en texte'),
    el('p', { class: 'muet' }, 'Le format de CLASS_TEMPLATE.fr.md, à coller dans une issue, un message ou un .md. Le JSON (bouton « Exporter ») est ce qui entre dans le jeu : content/classes/<id>.json, dans une PR.'),
    el('div', { class: 'boutons' }, el('button', { type: 'button', class: 'bouton-jeu', id: 'copier-fiche', onclick: () => copier(t, 'Fiche copiée.') }, 'Copier la fiche'),
      el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => copier(JSON.stringify(classe, null, 2), 'JSON copié.') }, 'Copier le JSON')),
    el('pre', { class: 'fiche', id: 'fiche-texte' }, t),
  ];
}

// --- L'onglet Cadre : lire le cadre, le retoucher ici, proposer un changement ------------------------------------
function cadrePage() {
  const nombre = (obj, cle, attrs = {}) => el('input', { type: 'number', class: 'nombre', value: obj[cle], step: attrs.step ?? 1, dataset: { cadre: attrs.id ?? cle },
    onchange: (e) => { obj[cle] = Number(e.target.value); changerCadre(); } });
  const ligne = (...cells) => el('tr', {}, ...cells.map((c) => el('td', {}, c)));
  const C = cadre.caracs, P = cadre.pointsClasse, K = cadre.capacites, D = cadre.paliers, N = cadre.niveaux;
  const modifie = cadreModifie();
  return [
    el('h2', {}, 'Le cadre des classes'),
    el('p', {}, el('strong', {}, cadre.version), ' · ', el('span', { class: 'muet' }, 'Le texte lisible est CLASS_FRAMEWORK.fr.md ; les chiffres ci-dessous en sont la version machine (src/classe/cadre.json). Ce que tu changes ici s’applique tout de suite à ton aperçu et reste dans ce navigateur : pour le proposer au groupe, copie le cadre et colle-le dans une issue « Idée ».')),
    el('div', { class: 'boutons' },
      el('button', { type: 'button', class: 'bouton-jeu discret', id: 'copier-cadre', onclick: () => copier(JSON.stringify(cadre, null, 2), 'Cadre copié.') }, 'Copier le cadre (JSON)'),
      el('button', { type: 'button', class: 'bouton-jeu discret', id: 'reinitialiser-cadre', disabled: !modifie, onclick: reinitialiserCadre }, 'Revenir au cadre du jeu'),
      modifie ? el('span', { class: 'conseil' }, 'Ce cadre est retouché ici : il diffère du cadre du jeu.') : el('span', { class: 'ok' }, 'C’est le cadre du jeu, tel quel.')),
    el('h3', {}, 'Les caractéristiques'),
    el('table', { class: 'table-cadre' }, el('tbody', {},
      ligne('Points à répartir', nombre(C, 'points', { id: 'caracs.points' })), ligne('Score de départ', nombre(C, 'base')), ligne('Minimum', nombre(C, 'min')), ligne('Maximum au niveau 1', nombre(C, 'max')),
      ...Object.keys(C.couts).map((s) => ligne(`Coût pour monter à ${s}`, nombre(C.couts, s, { id: `cout.${s}` }))))),
    el('h3', {}, 'Les points de classe'),
    el('table', { class: 'table-cadre' }, el('tbody', {},
      ligne('Points de classe', nombre(P, 'total', { id: 'pointsClasse.total' })), ligne('PV de base', nombre(P, 'pvBase')), ligne('PV minimum', nombre(P, 'pvMin')), ligne('PV maximum', nombre(P, 'pvMax')),
      ligne(`Un cran de PV (${P.pvPas}) à la hausse coûte`, nombre(P, 'pvCoutHausse')), ligne('… à la baisse rend', nombre(P, 'pvRenduBaisse')),
      ligne('PV par point non dépensé', nombre(P, 'pvParPointRestant')),
      ligne('Déplacement de base (cases)', nombre(P, 'vitesseBase')), ligne('Minimum', nombre(P, 'vitesseMin')), ligne('Maximum', nombre(P, 'vitesseMax')),
      ligne('+1 case coûte', nombre(P, 'vitesseCoutHausse')), ligne('−1 case rend', nombre(P, 'vitesseRenduBaisse')), ligne('Mètres par case', nombre(P, 'metresParCase', { step: 0.5 })))),
    el('h3', {}, 'Les capacités et leurs paliers'),
    el('table', { class: 'table-cadre' }, el('tbody', {},
      ligne('Capacités de départ', nombre(K, 'nombre')),
      ...K.sortes.map((s) => ligne(`${s.nom} : coût`, nombre(s, 'cout', { id: `sorte.${s.id}` }))),
      ...K.renforts.map((r) => ligne(`Renfort « ${r.nom} » : coût`, nombre(r, 'cout', { id: `renfort.${r.id}` }))),
      ...D.degats.map((p) => ligne(`Palier ${p.id} (${p.nom}) : fixe + dé`, el('span', { class: 'paire' }, nombre(p, 'base', { id: `palier.${p.id}.base` }), ' + d', nombre(p, 'de', { id: `palier.${p.id}.de` })))),
      ligne('Un soin, au plus (niveau 1)', nombre(D, 'soinMax')),
      ...D.portees.map((p) => ligne(`Portée ${p.nom.toLowerCase()} (m)`, nombre(p, 'm', { step: 0.25 }))),
      ...D.zones.filter((z) => z.rayon).map((z) => ligne(`${z.nom} : rayon (m)`, nombre(z, 'rayon', { step: 0.1 }))))),
    el('h3', {}, 'Les enveloppes des rôles (des conseils, pas des règles)'),
    el('table', { class: 'table-cadre' }, el('thead', {}, el('tr', {}, el('th', {}, 'Rôle'), el('th', {}, 'PV de … à'), el('th', {}, 'Cases de … à'), el('th', {}, 'Le conseil'))),
      el('tbody', {}, ...cadre.roles.map((r) => el('tr', {}, el('th', {}, r.nom), el('td', {}, el('span', { class: 'paire' }, nombre(r.pv, 0, { id: `role.${r.id}.pv0` }), '–', nombre(r.pv, 1, { id: `role.${r.id}.pv1` }))),
        el('td', {}, el('span', { class: 'paire' }, nombre(r.vitesse, 0), '–', nombre(r.vitesse, 1))), el('td', { class: 'muet' }, r.conseil))))),
    el('h3', {}, 'Les ressources communes'),
    el('ul', { class: 'liste-cadre' }, ...cadre.ressources.map((r) => el('li', {}, el('strong', {}, r.nom), ` : ${r.remplit} · max `, nombre(r, 'max', { id: `ressource.${r.id}` })))),
    el('h3', {}, 'Les accroches de combo'),
    el('ul', { class: 'liste-cadre' },
      ...cadre.accroches.statuts.map((s) => el('li', {}, el('strong', {}, s.nom), ' (statut)', s.effet ? ` : ${s.effet}` : '', s.exploite ? el('em', {}, ` · exploité : ${s.exploite}`) : null)),
      ...cadre.accroches.surfaces.map((s) => el('li', {}, el('strong', {}, s.nom), ' (surface) : ', s.effet, el('em', {}, ` · devient : ${s.devient}`))),
      ...cadre.accroches.positions.map((s) => el('li', {}, el('strong', {}, s.nom), ' (position) : ', s.effet))),
    el('h3', {}, 'Les interdits'),
    el('ul', { class: 'liste-cadre' }, ...cadre.interdits.map((i) => el('li', {}, i.texte))),
    el('h3', {}, 'Les barres que les classes doivent tenir en jeu'),
    el('table', { class: 'table-cadre' }, el('tbody', {},
      ligne('Part maximale des dégâts d’un héros (« personne ne porte les autres »)', nombre(cadre.barres, 'portageMax', { step: 0.05 })),
      ligne('Combos entre deux joueurs par combat, au moins', nombre(cadre.barres, 'combosParCombat')),
      ligne('Un round à quatre, au plus (minutes)', nombre(cadre.barres, 'roundMaxMinutes', { step: 0.5 })), ligne('Un combat (minutes)', nombre(cadre.barres, 'combatMinutes')))),
    el('h3', {}, 'Les niveaux'),
    el('table', { class: 'table-cadre' }, el('tbody', {},
      ligne('Niveau maximum', nombre(N, 'max')), ligne('PV par niveau', nombre(N, 'pvParNiveau')), ligne('La sous-classe au niveau', nombre(N, 'sousClasse')),
      ligne('Chemins de sous-classe', nombre(N, 'cheminsSousClasse')), ligne('Caractéristique maximale', nombre(N, 'caracMax')), ligne('Le coup d’équipe au niveau', nombre(N, 'coupEquipe')), ligne('La signature au niveau', nombre(N, 'signature')),
      ligne('Nouvelle capacité aux niveaux', el('span', { class: 'muet' }, N.nouvelleCapacite.join(', '))), ligne('Amélioration de caractéristique aux niveaux', el('span', { class: 'muet' }, N.ameliorationCarac.join(', '))))),
  ];
}
function changerCadre() { ecrire(CLE_CADRE, cadreModifie() ? cadre : null); dessinerApercu(); dessinerPastilles(); dessinerTete(); const b = dom.page.querySelector('#reinitialiser-cadre'); if (b) b.disabled = !cadreModifie(); }
function reinitialiserCadre() { cadre = clone(cadreBase); ecrire(CLE_CADRE, null); dessiner(); signaler('Le cadre du jeu est de retour.'); }

// --- L'aperçu du build, à droite ---------------------------------------------------------------------------------
function dessinerApercu() {
  const F = fiche(classe, cadre), V = verifier(classe, cadre);
  const role = cadre.roles.find((r) => r.id === classe.role), res = cadre.ressources.find((r) => r.id === classe.ressource);
  const jauge = (v, max, classeCss) => el('span', { class: `jauge-budget ${classeCss}` }, el('span', { style: `width:${Math.min(100, Math.max(0, (v / max) * 100))}%` }));
  dom.apercu.replaceChildren(...[
    el('header', { class: 'tete-apercu' },
      classe.look?.base ? portrait(classe.look.base, 56) : el('span', { class: 'portrait-vide' }),
      el('div', {}, el('strong', { class: 'nom-apercu', id: 'apercu-nom' }, classe.nom || 'Sans nom'),
        el('span', { class: 'role-apercu' }, [role?.nom, classe.twist].filter(Boolean).join(' · ') || 'rôle à choisir'))),
    el('div', { class: 'chiffres-apercu' },
      el('div', { class: 'grand' }, el('strong', { id: 'apercu-pv' }, F.pv), el('small', {}, 'PV')),
      el('div', { class: 'grand' }, el('strong', { id: 'apercu-metres' }, `${fr(F.metres)} m`), el('small', {}, 'par tour')),
      el('div', { class: 'grand' }, el('strong', {}, res ? res.nom : '—'), el('small', {}, 'ressource'))),
    el('ul', { class: 'mods-apercu' }, ...F.caracs.details.map((d) => el('li', { class: d.mod < 0 ? 'negatif' : d.mod > 0 ? 'positif' : '' }, el('span', {}, d.id), el('strong', {}, signe(d.mod)), el('small', {}, d.score)))),
    el('div', { class: 'budgets-apercu' },
      el('div', { class: F.caracs.reste < 0 ? 'depasse' : '' }, el('span', {}, `Caractéristiques ${F.caracs.depense}/${F.caracs.total}`), jauge(F.caracs.depense, F.caracs.total, 'caracs')),
      el('div', { class: F.classe.reste < 0 ? 'depasse' : '' }, el('span', { id: 'apercu-points' }, `Points de classe ${F.classe.depense}/${F.classe.total}`), jauge(F.classe.depense, F.classe.total, 'classe'))),
    el('ol', { class: 'caps-apercu' }, ...(classe.capacites ?? []).map((c, k) => {
      const d = degats(c, classe, cadre), s = cadre.capacites.sortes.find((x) => x.id === c.sorte), portee = cadre.paliers.portees.find((p) => p.id === c.portee);
      const liens = [...(c.cree ?? []).map((id) => `crée ${nomAccrocheCourt(id)}`), ...(c.utilise ?? []).map((id) => `utilise ${nomAccrocheCourt(id)}`)];
      return el('li', { class: c.slot }, el('strong', {}, c.nom || `Capacité ${k + 1}`), el('span', { class: 'muet' }, ` ${s?.nom.toLowerCase() ?? c.sorte}, ${c.slot === 'bonus' ? 'bonus' : c.slot}${portee ? `, ${fr(portee.m)} m` : ''}${c.cout ? `, ${c.cout}` : ''}`),
        d ? el('span', { class: 'degats-apercu' }, d.texte) : null, liens.length ? el('span', { class: 'liens-apercu' }, liens.join(' · ')) : null);
    })),
    classe.faiblesse ? el('p', { class: 'faiblesse-apercu' }, el('strong', {}, 'Faiblesse : '), classe.faiblesse) : null,
    el('p', { class: `verdict ${V.valide ? 'ok' : 'probleme'}`, id: 'verdict' }, V.valide ? '✔ Dans le cadre' : `✘ ${V.problemes.length} chose${V.problemes.length > 1 ? 's' : ''} à régler`),
    V.problemes.length ? el('ul', { class: 'problemes', id: 'problemes' }, ...V.problemes.map((p) => el('li', {}, el('button', { type: 'button', class: 'lien', onclick: () => montrer(p.ou) }, p.texte)))) : null,
    V.conseils.length ? el('ul', { class: 'conseils', id: 'conseils' }, ...V.conseils.map((p) => el('li', {}, el('button', { type: 'button', class: 'lien', onclick: () => montrer(p.ou) }, p.texte)))) : null,
  ].filter(Boolean));
}
const nomAccrocheCourt = (id) => accroches(cadre).find((a) => a.id === id)?.nom ?? id;

// Un portrait pris sur une planche LPC du jeu (la tête, de face, au repos), chargé une fois.
function portrait(base, taille) {
  const c = Object.assign(document.createElement('canvas'), { width: taille, height: taille, className: 'portrait-terrain' });
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const dessinerDans = (img) => g.drawImage(img, 16, 24 * 64 + 6, 32, 32, 0, 0, taille, taille);
  const im = (portraits[base] ??= Object.assign(new Image(), { src: `./assets/lpc/entrainement/${base}.png` }));
  if (im.complete && im.naturalWidth) dessinerDans(im); else im.addEventListener('load', () => dessinerDans(im), { once: true });
  return c;
}

// --- Enregistrer, ouvrir, exporter, importer ---------------------------------------------------------------------
function enregistrer(silencieux = false) {
  if (!classe.id) classe.id = identifiant(classe.nom);
  const sauvees = lire(CLE_CLASSES) ?? {};
  sauvees[classe.id] = classe;
  ecrire(CLE_CLASSES, sauvees); ecrire(CLE_COURANTE, classe.id);
  if (!silencieux) dessinerTete();
}
function nouvelle() { classe = classeVide(cadre); ecrire(CLE_COURANTE, null); onglet = 'identite'; dessiner(); }
function ouvrirSauvee(id) { const s = lire(CLE_CLASSES) ?? {}; if (!s[id]) return; classe = normaliser(s[id], cadre); ecrire(CLE_COURANTE, id); dessiner(); }
function ouvrirExemple(id) { if (!exemples[id]) return; classe = normaliser(clone(exemples[id]), cadre); enregistrer(true); onglet = 'identite'; dessiner(); signaler(`${classe.nom} : ouvert. Tu peux le modifier et l’enregistrer sous un autre nom.`); }
function exporter() {
  const texte = JSON.stringify(classe, null, 2), nom = `${classe.id || 'classe'}.json`;
  const a = el('a', { href: URL.createObjectURL(new Blob([texte], { type: 'application/json' })), download: nom });
  document.body.append(a); a.click(); a.remove();
  signaler(`${nom} téléchargé : à poser dans content/classes/ dans une PR.`);
}
function importer(texte) {
  try {
    const brut = JSON.parse(texte);
    classe = normaliser(brut, cadre);
    enregistrer(true); onglet = 'identite'; dessiner(); signaler(`${classe.nom || classe.id} : importée.`);
    return true;
  } catch { signaler('Ce fichier n’est pas une classe (JSON illisible).'); return false; }
}
async function copier(texte, message) { try { await navigator.clipboard.writeText(texte); signaler(message); } catch { signaler('Le presse-papier est fermé : sélectionne le texte et copie-le.'); } }

// Pour les tests et la console : l'état, sans détour.
export const api = {
  get classe() { return classe; }, get cadre() { return cadre; }, get cadreBase() { return cadreBase; }, get onglet() { return onglet; }, get dom() { return dom; },
  montrer, changer, importer, exporter, nouvelle, ouvrirExemple, ouvrirSauvee, reinitialiserCadre, changerCadre, enregistrer,
  verifier: () => verifier(classe, cadre), fiche: () => fiche(classe, cadre), ficheTexte: () => ficheTexte(classe, cadre),
  remplacerCadre(c) { cadre = c; changerCadre(); dessinerOnglet(); },
};
