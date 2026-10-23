// Les vérifications du HUD épique (DESIGN.fr.md §1, §5, §6, §8) : l'habillage dessiné en pixels, la barre entre ses loups,
// le médaillon, la bannière de campagne, la place de chaque pièce (le centre libre, rien qui se chevauche),
// le même cadre pour chaque panneau, les polices et les couleurs permises. Appelées depuis 09_tests.js.
import { P, cadreBois, texBois, medaillon } from './33_cadres.js';

const boite = (n) => n.getBoundingClientRect();
const coupe = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
const visible = (n) => !!n && !n.hidden && n.getClientRects().length > 0 && getComputedStyle(n).display !== 'none';
const pixel = (c, x, y) => [...c.getContext('2d').getImageData(x, y, 1, 1).data];
const OR = 'rgb(255, 211, 90)';

// Pour les autres pages (le terrain d'entraînement, l'armurerie) : la page est habillée, et chaque boîte nommée
// (sélecteur → ce qu'elle est) porte un cadre dessiné, dans les jetons de DESIGN.fr.md.
export function testsHabillage(t, boites) {
  t.group('l’habillage épique (DESIGN.fr.md)');
  t.ok(document.documentElement.classList.contains('habille'), 'la page est habillée : bois veiné, coins de laiton, parchemin');
  const sans = Object.entries(boites).filter(([sel]) => { const n = document.querySelector(sel); return !n || !getComputedStyle(n).borderImageSource.includes('url('); }).map(([, nom]) => nom);
  t.eq(sans, [], `chaque boîte dans son cadre à coins de laiton (${Object.values(boites).join(', ')})`);
  const s = getComputedStyle(document.documentElement);
  t.eq(['--bois', '--bois-fonce', '--parchemin', '--or'].map((v) => s.getPropertyValue(v).trim()), ['#573726', '#2b1c1d', '#f4ead2', '#ffd35a'], 'les jetons de couleur sont ceux de DESIGN.fr.md');
}

export function testsHudEpique(t, ctx, game) {
  const { hud, campagne, renommee, sentinelle, missions } = ctx;
  const racine = document.documentElement, style = getComputedStyle(racine);

  t.group('le HUD épique : l’habillage en pixels');
  t.ok(racine.classList.contains('habille'), 'la page est habillée (33_cadres.js a posé ses textures)');
  const vars = ['--tex-bois', '--tex-parchemin', '--cadre-bois', '--rivet', '--flamme', '--embout', '--socle', '--ecu', '--loup'];
  t.eq(vars.filter((v) => !style.getPropertyValue(v).includes('url(')), [], 'chaque texture est une image posée en variable CSS');
  const cadre = cadreBois();
  t.ok(cadre.width === 48 * P && cadre.height === 48 * P, `le cadre à neuf parts fait 48 × 48 pixels de dessin (${cadre.width} px)`);
  t.ok(pixel(cadre, 1 * P, 4 * P)[3] === 255 && pixel(cadre, 24 * P, 0)[3] === 0, 'le coin de laiton dépasse du bord, le milieu du bord ne dépasse pas');
  const laiton = pixel(cadre, 5 * P, 2 * P), bande = pixel(cadre, 24 * P, 6 * P);
  t.ok(laiton[0] > 150 && laiton[1] > 110 && bande[0] < 120, `le coin est en laiton (${laiton.slice(0, 3)}), le bord en bois (${bande.slice(0, 3)})`);
  t.ok(pixel(cadre, 24 * P, 4 * P).slice(0, 3).join() === '204,189,123', 'le bord a son liseré or');
  const bois = texBois();
  t.ok(bois.width % P === 0 && bois.height % P === 0, 'le grain du bois tombe sur des pixels entiers (jamais de flou)');
  t.ok(pixel(bois, 0, 0).join() === pixel(bois, 1, 1).join(), 'un pixel de dessin fait 2 × 2 pixels d’écran');

  t.group('le HUD épique : la barre d’action entre ses loups');
  const socle = hud.socleBarre, barre = hud.barre, b = boite(barre);
  t.ok(visible(socle) && socle.contains(barre), 'la barre est posée sur son socle');
  t.ok(getComputedStyle(barre).borderImageSource.includes('url('), 'la barre a le cadre de bois aux coins de laiton');
  t.eq(barre.querySelectorAll('.rivet').length, 4, 'quatre rivets sur la barre');
  const [lg, ld] = [...socle.querySelectorAll('.loup')], [eg, ed] = [...socle.querySelectorAll('.embout')];
  t.ok(lg && ld && eg && ed, 'deux loups sculptés et deux embouts de laiton');
  const rg = boite(lg), rd = boite(ld);
  t.ok(rg.right <= b.left + 8 && rd.left >= b.right - 8, 'un loup à chaque bout de la barre');
  t.ok(Math.abs(rg.bottom - b.bottom) <= 8 && Math.abs(rd.bottom - b.bottom) <= 8 && Math.abs(rg.height - b.height) <= b.height * 0.25,
    `les loups sont à la hauteur de la barre (loup ${Math.round(rg.height)} px, barre ${Math.round(b.height)} px)`);
  t.ok(getComputedStyle(ld.querySelector('.loup-bois')).transform !== 'none' && getComputedStyle(lg.querySelector('.loup-bois')).transform === 'none', 'les deux loups se font face, tournés vers la barre');
  t.ok(lg.querySelector('.socle') && ld.querySelector('.socle'), 'chacun sur son socle de laiton');
  const cases = [...barre.querySelectorAll('.case')], c0 = boite(cases[0]), k0 = boite(cases[0].querySelector('kbd'));
  t.ok(cases.every((c) => Math.round(boite(c).width) === 52 && Math.round(boite(c).height) === 52), 'chaque case fait 52 × 52 (DESIGN §5)');
  t.ok(k0.right > c0.left + c0.width / 2 && k0.bottom > c0.top + c0.height / 2, 'la touche est en bas à droite de sa case');
  t.ok(cases.every((c) => c.getAttribute('aria-label')), 'chaque case à icône seule a son nom (aria-label)');

  t.group('le HUD épique : le médaillon du héros');
  const garde = sentinelle.etat.qui;
  const r = { parPersonne: { Zed: 12, Ana: 30 }, parPhase: { 1: { Zed: 9, Ana: 20 } }, phaseEnCours: 1, titres: { Zed: 'Héraut' },
    gains: { 3: { qui: ['Zed'] }, 4: { qui: ['zed', 'Ana'] }, 5: { qui: ['Ana'] } } };
  const f = hud.fiche({ nom: 'Zed le bâtisseur', github: 'Zed' }, r, [{ number: 8, state: 'open', labels: [], assignees: [{ login: 'Zed' }] }]);
  t.eq([f.total, f.moiPhase, f.tete, f.rang, f.niveau, f.titre], [12, 9, 20, 2, 2, 'Héraut'], 'la fiche : renommée, place dans la phase, niveau = missions rentrées, titre');
  t.eq(hud.fiche({ nom: 'Zorg', github: null }, r).niveau, null, 'un visiteur n’a pas de niveau');
  sentinelle.etat.qui = { nom: 'Paul', github: 'PCrrfng', saisie: 'Paul' };
  hud.majHeros();
  const ch = hud.cadreHeros, med = ch.querySelector('canvas.medaillon');
  t.ok(visible(ch) && med && med.width === 120 && med.height === 120, 'le médaillon : 60 pixels de dessin à l’échelle 2');
  t.ok(med?.getAttribute('role') === 'button' && /Paul/.test(med.getAttribute('aria-label') ?? '') && /changer de héros/i.test(med.title), 'le portrait dit de qui il est, et un clic change de héros');
  const centre = pixel(med, 60, 44), anneau = pixel(med, 60, 3 * P);
  t.ok(centre[3] === 255 && anneau[0] > 120 && anneau[2] < 140, 'le héros au cœur, l’anneau de laiton autour');
  t.ok(ch.querySelector('.nom')?.textContent === 'Paul' && ch.querySelector('.ecu'), 'le bandeau porte ton nom, l’écu ton niveau');
  t.ok(!ch.textContent.includes('null') && !ch.textContent.includes('undefined'), 'rien qui traîne (pas de « null »)');
  // le bout du bandeau est arrondi : le texte et la jauge s'arrêtent avant la courbe (une longue fiche, pour le pire cas)
  const bandeau = ch.querySelector('.bandeau-heros'), fin = boite(bandeau).right - 42;
  const debord = [...bandeau.querySelectorAll('.total, .quetes, .jauge-heros, .nom, .ligne-titre span')].filter((n) => {
    if (getComputedStyle(n).overflow === 'hidden') return boite(n).right > fin + 0.5;   // (coupé en « … » : sa boîte suffit)
    const q = document.createRange(); q.selectNodeContents(n); return Math.max(boite(n).right, q.getBoundingClientRect().right) > fin + 0.5;
  }).map((n) => `${n.className || n.tagName}: ${n.textContent}`);
  t.eq(debord, [], 'le nom, ✦, la jauge et les quêtes tiennent dans le bandeau, avant son bout arrondi');
  sentinelle.etat.qui = { nom: 'Zorg', github: null, saisie: 'Zorg' };
  hud.majHeros();
  t.ok(!ch.querySelector('.ecu') && ch.textContent.includes('Zorg'), 'un visiteur : son nom, sans écu');
  sentinelle.etat.qui = garde; hud.majHeros();
  t.ok(medaillon(null).width === 120, 'sans planche (une image pas encore chargée), le médaillon se dessine quand même');

  t.group('le HUD épique : la bannière de campagne');
  const ban = campagne.barre, rb = boite(ban);
  t.ok(visible(ban) && Math.abs((rb.left + rb.right) / 2 - innerWidth / 2) <= 2 && rb.top < 40, `en haut au centre (${Math.round(rb.left)}–${Math.round(rb.right)}, haut ${Math.round(rb.top)})`);
  t.ok(ban.querySelector('.titre-campagne') && ban.querySelector('.jauge-campagne .rempli'), 'le chapitre en cours et sa jauge');
  t.eq(ban.querySelectorAll('.flamme').length, 2, 'deux flammes rouges pendent sous la bannière');
  t.ok(getComputedStyle(ban).borderImageSource.includes('url(') && ban.tabIndex === 0, 'dans le cadre de bois, et atteignable au clavier');
  const avant = campagne.ouvert;
  ban.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); game.dbg.advance(0.02);
  t.ok(campagne.ouvert !== avant, 'Entrée sur la bannière ouvre la carte de campagne');
  hud.activer('campagne'); if (campagne.ouvert) hud.activer('campagne');

  t.group('le HUD épique : chaque pièce à sa place (DESIGN §6)');
  hud.ranger();
  const gauche = hud.colonneGauche, jouer = document.querySelector('#groupe');
  t.ok(gauche.firstElementChild === ch && jouer?.parentNode === gauche, 'à gauche : le médaillon, puis « Jouer à plusieurs » dessous');
  if (jouer && visible(jouer)) t.ok(boite(jouer).top >= boite(ch).bottom - 4, '« Jouer à plusieurs » ne passe pas sous le médaillon');
  const plaque = renommee.plaque, suivi = hud.suivi;
  const pieces = { médaillon: ch, 'jouer à plusieurs': jouer, bannière: ban, renommée: plaque, barre: socle };
  const vues = Object.entries(pieces).filter(([, n]) => visible(n));
  const chevauche = [];
  for (const [a, na] of vues) for (const [bb, nb] of vues) if (a < bb && coupe(boite(na), boite(nb))) chevauche.push(`${a}/${bb}`);
  t.eq(chevauche, [], `les pièces du HUD ne se chevauchent pas (${innerWidth} × ${innerHeight})`);
  const mort = { left: innerWidth * 0.35, right: innerWidth * 0.65, top: innerHeight * 0.35, bottom: innerHeight * 0.65 };
  t.eq([...vues, ['suivi', suivi]].filter(([, n]) => visible(n) && coupe(boite(n), mort)).map(([k]) => k), [], 'rien de fixe dans la zone morte de la caméra (30 % au centre)');
  const marge = vues.map(([k, n]) => [k, boite(n)]).filter(([, q]) => q.left < 6 || q.top < 6 || innerWidth - q.right < 4 || innerHeight - q.bottom < 4).map(([k]) => k);
  t.eq(marge, [], 'une marge aux bords de l’écran');

  t.group('le HUD épique : le suivi des quêtes, en or, sans cadre');
  sentinelle.etat.qui = { nom: 'Paul', github: 'PCrrfng', saisie: 'Paul' };
  missions.charger([{ number: 61, title: 'Une quête', state: 'open', html_url: '#', labels: [{ name: 'taille: S' }], assignees: [{ login: 'PCrrfng' }] }]);
  hud.majSuivi();
  const tq = suivi.querySelector('.titre-q');
  t.ok(tq && getComputedStyle(tq).color === OR, 'le titre de la quête en or');
  t.ok(getComputedStyle(suivi).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(suivi).borderTopWidth === '0px', 'sans cadre ni fond');
  t.ok(boite(suivi).top >= boite(plaque).bottom - 2, 'sous la renommée, sur le bord droit');
  sentinelle.etat.qui = garde; missions.charger([]); hud.majSuivi();

  t.group('le HUD épique : le même cadre pour chaque panneau');
  const sans = [];
  for (const c of hud.CASES) {
    if (c.id === 'dashboard') continue;   // (elle n'ouvre pas de panneau : elle part vers le dashboard)
    if (!hud.activer(c.id)) continue;
    game.dbg.advance(0.02);
    const ouverts = [...document.querySelectorAll('.panneau-missions, .cadres-groupe, .carte-campagne, .chronique-camp, .sacoche, .rumeurs, .messagerie-jeu')].filter(visible);
    if (ouverts.length !== 1 || !getComputedStyle(ouverts[0]).borderImageSource.includes('url(')) sans.push(`${c.id} (${ouverts.length} ouvert${ouverts.length > 1 ? 's' : ''})`);
    hud.activer(c.id); game.dbg.advance(0.02);
  }
  t.eq(sans, [], 'chaque case ouvre un seul panneau, dans le cadre de bois aux coins de laiton');
  hud.activer('groupe'); game.dbg.advance(0.02);
  t.ok(document.querySelector('#groupe-cadres')?.parentNode === gauche, 'le groupe (P) s’ouvre à gauche, sous « Jouer à plusieurs »');
  hud.activer('groupe');
  // un panneau de gauche ne déborde pas de son cadre : son dernier enfant visible tient dedans
  const debordent = [];
  for (const id of ['groupe', 'chronique', 'lettres']) {
    hud.activer(id); game.dbg.advance(0.02);
    const p = [...gauche.children].find((n) => n !== ch && n.id !== 'groupe' && visible(n));
    const dernier = p && [...p.children].filter(visible).pop();
    if (p && dernier && boite(dernier).bottom > boite(p).bottom - 4) debordent.push(id);
    hud.activer(id); game.dbg.advance(0.02);
  }
  t.eq(debordent, [], 'les panneaux de gauche tiennent dans leur cadre (rien ne dépasse en bas)');

  t.group('le HUD épique : polices et couleurs (DESIGN §2, §3)');
  const permises = /^"?(Pixelify Sans|Source Sans 3|ui-monospace)"?/;
  const fautes = new Set();
  for (const n of [ch, ban, socle, plaque, suivi, jouer].filter(Boolean)) for (const e of [n, ...n.querySelectorAll('*')]) {
    if (!e.childNodes.length || ![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) continue;
    const ff = getComputedStyle(e).fontFamily;
    if (!permises.test(ff)) fautes.add(`${e.className || e.tagName}: ${ff.split(',')[0]}`);
  }
  t.eq([...fautes], [], 'tout le texte du HUD est en Pixelify Sans ou Source Sans 3');
  t.eq(style.getPropertyValue('--bois').trim() + style.getPropertyValue('--bois-fonce').trim() + style.getPropertyValue('--or').trim(), '#573726#2b1c1d#ffd35a', 'les jetons de couleur sont ceux de DESIGN.fr.md');
  const focus = [...barre.querySelectorAll('.case'), ban].map((n) => { n.focus(); return getComputedStyle(n).outlineStyle; });
  t.ok(focus.every((o) => o !== 'none'), 'le focus clavier se voit sur chaque case et sur la bannière');
  document.activeElement?.blur?.();
}
