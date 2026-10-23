// Les vérifications de l'onglet « Plans » du tableau des missions (45_plans.js, mission #157) : le format des fiches,
// les sceaux lus dans les missions, la fusion des fiches du dépôt et des commentaires de l'équipe, puis l'onglet lui-même
// avec un faux GitHub (lire, modifier, créer, retirer, déplacer, un conflit). Appelées depuis 09_tests.js.
import { lireFiche, references, etatDe, fusionner, lireEntete, ecrireEntete, chosesDe, SORTES, ISSUE } from './45_plans.js';

const JETON = 'ghu_jeton-des-plans';
const CHEMIN = `/repos/Mastre-gaming/DungeonCoop/issues/${ISSUE}/comments`;

// Un faux GitHub qui ne connaît que les commentaires de l'issue des plans.
function fauxGithub(login = 'DonBabaa') {
  const g = { commentaires: new Map(), appels: [], prochain: 900 };
  const rep = (status, corps) => ({ ok: status < 300, status, json: async () => JSON.parse(JSON.stringify(corps ?? null)) });
  g.ajouter = (c) => { g.commentaires.set(c.id, { html_url: '#', user: { login }, author_association: 'OWNER', updated_at: '2026-10-19T10:00:00Z', ...c }); };
  g.fetch = async (url, o = {}) => {
    const u = new URL(url), m = o.method ?? 'GET', corps = o.body ? JSON.parse(o.body) : null;
    g.appels.push({ hote: u.host, m, chemin: u.pathname, corps });
    if (u.host !== 'api.github.com') return rep(404, {});
    if (u.pathname === '/user') return o.headers?.Authorization === `Bearer ${JETON}` ? rep(200, { login }) : rep(401, { message: 'Bad credentials' });
    if (m === 'GET' && u.pathname === CHEMIN) return rep(200, [...g.commentaires.values()]);
    if (o.headers?.Authorization !== `Bearer ${JETON}`) return rep(401, { message: 'Bad credentials' });
    const k = /^\/repos\/Mastre-gaming\/DungeonCoop\/issues\/comments\/(\d+)$/.exec(u.pathname);
    const maintenant = () => new Date(Date.now() + g.appels.length * 1000).toISOString();
    if (m === 'POST' && u.pathname === CHEMIN) { const c = { id: ++g.prochain, body: corps.body, updated_at: maintenant() }; g.ajouter(c); return rep(201, g.commentaires.get(c.id)); }
    if (k && m === 'GET') return g.commentaires.has(Number(k[1])) ? rep(200, g.commentaires.get(Number(k[1]))) : rep(404, { message: 'Not Found' });
    if (k && m === 'PATCH') { const c = g.commentaires.get(Number(k[1])); if (!c) return rep(404, {}); c.body = corps.body; c.updated_at = maintenant(); return rep(200, c); }
    if (k && m === 'DELETE') { g.commentaires.delete(Number(k[1])); return { ok: true, status: 204, json: async () => null }; }
    return rep(404, { message: 'Not Found' });
  };
  return g;
}

const attendre = async (cond, ms = 4000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (cond()) return true; await new Promise((r) => setTimeout(r, 20)); } return !!cond(); };
const issue = (number, { state = 'open', qui = [], labels = [], jalon = null, raison = null } = {}) => ({
  number, title: `Mission ${number}`, state, state_reason: raison, html_url: '#', labels: labels.map((name) => ({ name })),
  assignees: qui.map((login) => ({ login })), milestone: jalon ? { title: jalon } : null, body: '',
});

export async function testsPlans(t, ctx) {
  const { panneau, missions, github } = ctx;
  if (!panneau?.plans) return;
  const plans = panneau.plans;

  t.group('les plans : le format d’une fiche');
  const exemple = lireFiche([
    '# Le combat', '> Le cœur du jeu.', '', 'Un **paragraphe**', 'sur deux lignes.', '',
    '## Un tour', ':: flux', 'Se déplacer | jusqu’à 7,5 m | #14', 'Agir | une capacité', '',
    '## Prévu', '- Le terrain #14 #80', '- ? Le mode de tour #26 @équipe', '- + Une règle acquise', '- ~ Une vieille idée', '- x Hors du jeu', '- * En chantier sans mission',
    '## Les jalons', '- La campagne %M1', ':: dessin-inconnu',
  ].join('\n'));
  t.ok(exemple.titre === 'Le combat' && exemple.resume === 'Le cœur du jeu.', 'le titre (« # ») et le résumé (« > »)');
  t.eq(exemple.parties.map((p) => p.titre), ['', 'Un tour', 'Prévu', 'Les jalons'], 'les parties (« ## »), avec le texte d’avant la première');
  t.ok(exemple.parties[0].morceaux[0].texte === 'Un **paragraphe** sur deux lignes.', 'les lignes qui se suivent font un paragraphe');
  const flux = exemple.parties[1].morceaux[0];
  t.ok(flux.t === 'visuel' && flux.sorte === 'flux' && flux.lignes.length === 2 && flux.lignes[0][2] === '#14', ':: flux : une étape par ligne, ses cases séparées par |');
  t.eq(exemple.parties[2].morceaux[0].items.map((i) => i.marque), [null, 'trancher', 'acquis', 'remplace', 'ecarte', 'chantier'], 'les marques : rien, ?, +, ~, x, *');
  const r = references('Le mode de tour #26 et #27 (%M1) @Paolitus, fini');
  t.ok(r.missions.join() === '26,27' && r.jalons.join() === 'M1' && r.qui.join() === 'Paolitus' && r.texte === 'Le mode de tour et, fini', `les références sortent du texte (« ${r.texte} »)`);
  t.eq(exemple.inconnues, ['dessin-inconnu'], 'un dessin inconnu est signalé');
  t.ok(references('la couleur #c2412f, pas une mission').missions.length === 0, 'une couleur (#c2412f) n’est pas une mission');
  t.eq(chosesDe(exemple).length, 8, 'les choses prévues d’une fiche : ses lignes de liste et ses étapes reliées à une mission');

  t.group('les plans : les sceaux suivent les missions');
  const is = [issue(1, { state: 'closed' }), issue(2, { qui: ['PCrrfng'] }), issue(3), issue(4, { labels: ['idée'] }), issue(5, { state: 'closed', raison: 'not_planned' }),
    issue(6, { state: 'closed', jalon: 'M1 · The table is set' }), issue(7, { jalon: 'M1 · The table is set' }), { ...issue(8), pull_request: {} }];
  const e = (missionsRef, o = {}) => etatDe({ missions: missionsRef, jalons: [], ...o }, is);
  t.ok(e([1]).etat === 'bati' && e([2]).etat === 'chantier' && e([3]).etat === 'aprendre' && e([4]).etat === 'idee', 'rentrée = bâti ; quelqu’un dessus = en chantier ; personne = à prendre ; une idée = idée');
  t.ok(e([]).etat === 'prevu' && e([99]).etat === 'prevu' && e([8]).etat === 'prevu', 'sans mission (ou une PR, ou un numéro inconnu) : pas encore de mission');
  t.ok(e([1, 3]).etat === 'aprendre' && e([1, 3]).faites === 1 && e([1, 3]).total === 2, 'plusieurs missions : l’avancée (1/2)');
  t.ok(e([1, 5]).etat === 'bati' && e([1, 5]).total === 1, 'une mission abandonnée ne compte pas');
  t.ok(e([1, 2]).etat === 'chantier', 'une rentrée et une en cours : en chantier');
  t.ok(etatDe({ missions: [], jalons: ['M1'] }, is).total === 2, '%M1 : toutes les missions du jalon M1');
  t.ok(e([1], { marque: 'trancher' }).etat === 'trancher', 'la marque l’emporte sur les missions (? à trancher)');

  t.group('les plans : les fiches du dépôt et celles de l’équipe');
  const depart = [{ id: 'a', ordre: 10, texte: '# A', source: 'depot' }, { id: 'b', ordre: 20, texte: '# B', source: 'depot' }];
  const c = (id, body, o = {}) => ({ id, body, author_association: 'MEMBER', updated_at: '2026-10-19T10:00:00Z', user: { login: 'PCrrfng' }, html_url: '#', ...o });
  t.ok(lireEntete('<!-- plan id=a ordre=10 -->\n# A2').texte === '# A2' && lireEntete('Un commentaire normal') === null, 'l’en-tête d’un commentaire de plan ; un commentaire normal est ignoré');
  t.ok(ecrireEntete({ id: 'x', ordre: 30 }, '# X') === '<!-- plan id=x ordre=30 -->\n# X\n' && lireEntete(ecrireEntete({ id: 'x', supprimee: true })).supprimee, 'écrire puis relire un en-tête (et « supprimee »)');
  let f = fusionner(depart, [c(1, '<!-- plan id=a ordre=10 -->\n# A modifiée')]);
  t.ok(f[0].texte === '# A modifiée' && f[0].source === 'github' && f[0].depart && f[1].source === 'depot', 'un commentaire de l’équipe l’emporte sur la fiche du dépôt');
  f = fusionner(depart, [c(1, '<!-- plan id=a ordre=10 -->\n# Pirate', { author_association: 'NONE' }), c(2, '<!-- plan id=a ordre=10 -->\n# Contrib', { author_association: 'CONTRIBUTOR' })]);
  t.ok(f[0].texte === '# A', 'le repo est public : un commentaire hors de l’équipe ne change rien');
  f = fusionner(depart, [c(1, '<!-- plan id=a supprimee -->'), c(2, '<!-- plan id=z ordre=15 -->\n# Z')]);
  t.eq(f.map((x) => x.id), ['z', 'b'], 'une fiche retirée disparaît ; une nouvelle prend sa place dans l’ordre');
  f = fusionner(depart, [c(2, '<!-- plan id=a ordre=10 -->\n# Récente', { updated_at: '2026-10-20T10:00:00Z' }), c(1, '<!-- plan id=a ordre=10 -->\n# Ancienne')]);
  t.ok(f[0].texte === '# Récente', 'deux commentaires pour une fiche : le plus récent');

  const toutes = plans.fiches().filter((x) => x.source === 'depot');
  t.ok(toutes.length >= 10, `les fiches de départ sont dans le dépôt (content/plans : ${toutes.length})`);
  const lues = toutes.map((x) => ({ x, l: lireFiche(x.texte) }));
  t.ok(lues.every(({ l }) => l.titre && l.resume && l.parties.length >= 2), 'chacune a un titre, un résumé et des parties');
  t.eq(lues.flatMap(({ l }) => l.inconnues), [], `elles n’utilisent que les dessins connus (${SORTES.join(', ')})`);
  t.ok(new Set(toutes.map((x) => x.id)).size === toutes.length, 'leurs id sont tous différents');
  t.ok(lues.some(({ l }) => l.parties.some((p) => p.morceaux.some((m) => m.sorte === 'camp'))), 'une fiche montre le plan du camp');

  // --- L'onglet, avec un faux GitHub ---
  if (!github) return;
  const g = fauxGithub();
  github.relier({ fetch: g.fetch });
  plans.relier({ fetch: g.fetch });
  await github.poserJeton(null);
  plans.oublier();
  missions.charger([issue(14, { state: 'closed' }), issue(26), issue(30, { state: 'closed' }), issue(31, { qui: ['PCrrfng'] })], [{ github: 'DonBabaa', nom: 'Baba' }, { github: 'PCrrfng', nom: 'Paul' }]);
  const boite = panneau.boite, bouton = (texte, racine = boite) => [...racine.querySelectorAll('button')].find((b) => b.textContent.trim() === texte);
  const fiche = () => boite.querySelector('.fiche-plan h4')?.textContent;
  const sommaire = () => [...boite.querySelectorAll('.sommaire-plans .zone .nom')].map((x) => x.textContent);

  t.group('l’onglet « Plans » du tableau des missions (faux GitHub)');
  panneau.ouvrir('interface', 'missions');
  t.ok(bouton('Missions')?.getAttribute('aria-selected') === 'true' && boite.querySelector('.zones[aria-label="Zones à construire"]'), 'le tableau s’ouvre sur l’onglet Missions, comme avant');
  bouton('Plans').click();
  t.ok(panneau.onglet === 'plans' && bouton('Plans').getAttribute('aria-selected') === 'true' && boite.querySelector('[role=tabpanel]'), 'un clic sur « Plans » ouvre l’onglet (role tab, tabpanel)');
  t.ok(sommaire().length === toutes.length && fiche() === sommaire()[0], `le sommaire des fiches à gauche (${sommaire().length}), la première ouverte à droite`);
  t.ok(boite.querySelectorAll('.legende-plans .sceau-plan').length >= 5, 'la légende des sceaux');
  t.ok(!bouton('Modifier') && !bouton('+ Nouvelle fiche') && boite.textContent.includes('Se connecter à GitHub'), 'sans connexion : on lit seulement, et on sait comment modifier');
  t.ok(await attendre(() => g.appels.some((a) => a.m === 'GET' && a.chemin === CHEMIN)), 'l’onglet lit les commentaires de la mission des plans');
  const combat = toutes.find((x) => lireFiche(x.texte).titre === 'Le combat');
  plans.choisir(combat.id);
  const li14 = [...boite.querySelectorAll('.chose')].find((x) => x.querySelector('.ref-mission')?.textContent === '#14');
  t.ok(li14?.classList.contains('c-bati') && li14.querySelector('.sceau-plan.s-bati'), 'une chose reliée à une mission rentrée porte le sceau « Bâti »');
  const li26 = [...boite.querySelectorAll('.chose')].find((x) => x.querySelector('.ref-mission')?.textContent === '#26');
  t.ok(li26?.classList.contains('c-trancher') && li26.querySelector('.ref-mission.r-aprendre'), '« ? » : à trancher, et sa mission montre qu’elle est à prendre');
  t.ok(boite.querySelector('.flux .etape') && boite.querySelector('.cartes-plan .carte-plan') && boite.querySelector('.tableau-plan table'), 'les dessins : flux, cartes, tableau');
  plans.choisir(toutes.find((x) => lireFiche(x.texte).titre === 'Le camp').id);
  t.ok(boite.querySelectorAll('.plan-camp .lieu-plan').length === 8 && boite.querySelector('.plan-camp .feu-plan'), 'le plan du camp : les 8 lieux et le feu');

  await github.poserJeton(JETON);
  plans.choisir(toutes[0].id);
  t.ok(bouton('Modifier') && bouton('Supprimer') && bouton('+ Nouvelle fiche'), 'connecté : Modifier, Supprimer, monter, descendre, et « + Nouvelle fiche »');

  bouton('Modifier').click();
  const zone = () => boite.querySelector('.plans-edition textarea');
  t.ok(zone()?.value === toutes[0].texte && boite.querySelector('.apercu-plan .fiche-plan'), 'Modifier : le texte de la fiche, et son aperçu à côté');
  zone().value = `${toutes[0].texte.replace(/^# .*/, '# Le jeu, en une page')}\n\n## Ajouté au camp\n- Une chose nouvelle #31`;
  zone().dispatchEvent(new Event('input'));
  t.ok(await attendre(() => boite.querySelector('.apercu-plan h4')?.textContent === 'Le jeu, en une page'), 'l’aperçu suit le texte pendant qu’on écrit');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
  t.ok(panneau.ouvert && !zone() && fiche() === lireFiche(toutes[0].texte).titre, 'Échap ferme d’abord la fiche en cours, pas le tableau, et rien n’est écrit');

  bouton('Modifier').click();
  zone().value = `${toutes[0].texte.replace(/^# .*/, '# Le jeu, en une page')}\n\n## Ajouté au camp\n- Une chose nouvelle #31`;
  zone().dispatchEvent(new Event('input'));
  bouton('Enregistrer').click();
  t.ok(await attendre(() => !plans.occupe && fiche() === 'Le jeu, en une page'), 'Enregistrer : la fiche change tout de suite');
  const post = g.appels.find((a) => a.m === 'POST' && a.chemin === CHEMIN);
  t.ok(post?.corps.body.startsWith(`<!-- plan id=${toutes[0].id} ordre=${toutes[0].ordre} -->\n# Le jeu, en une page`), 'une fiche du dépôt modifiée devient un commentaire de la mission des plans, avec son en-tête');
  t.ok(boite.textContent.includes('modifiée au camp') && boite.querySelector('.tete-fiche a')?.textContent.includes('historique'), 'elle dit qu’elle est modifiée au camp, avec le lien de son historique');
  t.ok([...boite.querySelectorAll('.chose')].some((x) => x.classList.contains('c-chantier') && x.textContent.includes('Paul')), 'la ligne ajoutée suit sa mission (#31 : en chantier avec Paul)');

  bouton('Modifier').click();
  zone().value = zone().value.replace('Une chose nouvelle', 'Une chose renommée');
  zone().dispatchEvent(new Event('input'));
  bouton('Enregistrer').click();
  t.ok(await attendre(() => !plans.occupe && boite.textContent.includes('Une chose renommée')), 'modifier encore : le même commentaire change');
  const patchs = g.appels.filter((a) => a.m === 'PATCH');
  t.ok(patchs.length === 1 && g.appels.filter((a) => a.m === 'POST').length === 1, 'un seul commentaire par fiche (PATCH, pas un nouveau)');

  // un ami l'a changée pendant qu'on écrivait : on ne l'écrase pas
  bouton('Modifier').click();
  const [cid] = g.commentaires.keys();
  g.commentaires.get(cid).body = g.commentaires.get(cid).body.replace('renommée', 'changée par Paul');
  g.commentaires.get(cid).updated_at = '2026-10-21T10:00:00Z';
  g.commentaires.get(cid).user = { login: 'PCrrfng' };
  zone().value = zone().value.replace('Une chose renommée', 'Ma version');
  zone().dispatchEvent(new Event('input'));
  bouton('Enregistrer').click();
  t.ok(await attendre(() => !plans.occupe && plans.nouvelle?.grave), 'un ami l’a changée entre-temps : l’enregistrement s’arrête');
  t.ok(zone()?.value.includes('Ma version') && boite.querySelector('.conflit pre')?.textContent.includes('changée par Paul') && !g.commentaires.get(cid).body.includes('Ma version'),
    'ton texte est gardé, sa version est montrée, rien n’est écrasé');
  bouton('Enregistrer').click();
  t.ok(await attendre(() => !plans.occupe && !zone() && g.commentaires.get(cid).body.includes('Ma version')), 'enregistrer à nouveau, en connaissance de cause, passe');

  // une nouvelle fiche
  bouton('+ Nouvelle fiche').click();
  t.ok(zone()?.value.startsWith('# Une nouvelle fiche'), '« + Nouvelle fiche » : un modèle à remplir');
  zone().value = '# Les sons du donjon\n> Ce qu’on entend dans la tour.\n\n## Prévu\n- Les bruitages des combos';
  zone().dispatchEvent(new Event('input'));
  bouton('Créer la fiche').click();
  t.ok(await attendre(() => !plans.occupe && sommaire().at(-1) === 'Les sons du donjon' && fiche() === 'Les sons du donjon'), 'Créer : elle arrive au bout du sommaire, ouverte');
  const nouvelleC = [...g.commentaires.values()].find((x) => x.body.includes('Les sons du donjon'));
  t.ok(/^<!-- plan id=les-sons-du-donjon-\w+ ordre=\d+ -->/.test(nouvelleC?.body ?? ''), `avec un id tiré de son titre (${nouvelleC?.body.split('\n')[0]})`);

  // monter
  bouton('↑').click();
  t.ok(await attendre(() => !plans.occupe && sommaire().at(-2) === 'Les sons du donjon'), '↑ : la fiche monte d’un cran (les deux fiches gardent leur ordre dans GitHub)');

  // retirer une fiche créée au camp, puis une fiche du dépôt
  bouton('Supprimer').click();
  t.ok(bouton('Oui, retirer') && sommaire().includes('Les sons du donjon'), 'Supprimer demande d’abord « Retirer cette fiche ? »');
  bouton('Oui, retirer').click();
  t.ok(await attendre(() => !plans.occupe && !sommaire().includes('Les sons du donjon')), 'une fiche créée au camp : son commentaire est supprimé');
  t.ok(!g.commentaires.has(nouvelleC.id) && g.appels.some((a) => a.m === 'DELETE'), '(DELETE sur GitHub)');
  const avant = sommaire().length, derniere = toutes.at(-1);
  plans.choisir(derniere.id);
  bouton('Supprimer').click(); bouton('Oui, retirer').click();
  t.ok(await attendre(() => !plans.occupe && sommaire().length === avant - 1), 'une fiche du dépôt : elle quitte l’onglet');
  t.ok([...g.commentaires.values()].some((x) => x.body === `<!-- plan id=${derniere.id} supprimee -->`), 'un commentaire « supprimee » la retire (le fichier du dépôt reste, son historique aussi)');

  // l'autre onglet
  bouton('Missions').click();
  t.ok(panneau.onglet === 'missions' && boite.querySelector('.zones[aria-label="Zones à construire"]') && !boite.querySelector('.plans'), 'retour à l’onglet Missions : le panneau d’avant');
  boite.querySelector('.onglets').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  t.ok(panneau.onglet === 'plans' && document.activeElement?.dataset.onglet === 'plans', 'au clavier : → passe d’un onglet à l’autre');
  t.ok(g.appels.every((a) => a.hote === 'api.github.com'), `rien d’autre que le faux GitHub (${g.appels.length} appels)`);

  panneau.ouvrir(null, 'missions'); panneau.fermer();
  await github.poserJeton(null);
  github.delier();
  plans.delier();
  plans.oublier();
}
