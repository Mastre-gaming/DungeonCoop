// Le budget d'une classe, calculé d'après le cadre (cadre.json, lisible dans CLASS_FRAMEWORK.fr.md) : les points de
// caractéristiques, les points de classe, les PV et la distance qui en sortent, les dégâts de chaque capacité, et les
// vérifications (ce qui bloque, ce qui est conseillé). Rien de visuel ici : l'éditeur (editeur.js) affiche, les
// tests rejouent. Une classe est un objet JSON (le format est dans CLASS_FRAMEWORK.fr.md §8).

export const CARACS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
export const modificateur = (score) => Math.floor((Number(score) - 10) / 2);
export const signe = (n) => (n >= 0 ? `+${n}` : `${n}`);
export const metres = (cases, cadre) => Math.round(cases * (cadre.pointsClasse.metresParCase ?? 1.5) * 10) / 10;

// Une classe vide, prête à remplir (les valeurs de départ du cadre).
export function classeVide(cadre) {
  const P = cadre.pointsClasse;
  return {
    version: 1, id: '', nom: '', auteur: '', phrase: '', role: '', twist: '', archetype: '',
    caracs: Object.fromEntries(CARACS.map((c) => [c, cadre.caracs.base])),
    pv: P.pvBase, vitesse: P.vitesseBase, ressource: '',
    capacites: [{ nom: '', sorte: 'base', slot: 'action', portee: 'contact', zone: 'aucune', carac: 'FOR', cout: '', effet: '', cree: [], utilise: [], renforts: [] }],
    faiblesse: '', sousClasses: [{ nom: '', idee: '' }, { nom: '', idee: '' }],
    look: { corps: '', tenue: '', touche: '', lien: '', base: '' }, references: '',
  };
}

// Une capacité vide d'une sorte donnée.
export function capaciteVide(cadre, sorte = 'preparation') {
  const s = cadre.capacites.sortes.find((x) => x.id === sorte) ?? cadre.capacites.sortes[0];
  return { nom: '', sorte: s.id, slot: s.slot, portee: 'contact', zone: 'aucune', carac: 'FOR', cout: '', effet: '', cree: [], utilise: [], renforts: [] };
}

// --- Les caractéristiques (27 points, l'achat de la 5e) -----------------------------------------------------------
export function coutCarac(score, cadre) {
  const C = cadre.caracs, v = Number(score);
  if (v <= C.base) return 0;
  return C.couts[String(v)] ?? Infinity;         // au-dessus du max : impossible
}
export function budgetCaracs(classe, cadre) {
  const details = CARACS.map((id) => {
    const score = Number(classe.caracs?.[id] ?? cadre.caracs.base);
    return { id, score, mod: modificateur(score), cout: coutCarac(score, cadre) };
  });
  const depense = details.reduce((s, d) => s + d.cout, 0);
  return { details, depense, total: cadre.caracs.points, reste: cadre.caracs.points - depense };
}

// --- Les points de classe (10) -----------------------------------------------------------------------------------
export function coutPv(pv, cadre) {
  const P = cadre.pointsClasse, pas = Math.round((Number(pv) - P.pvBase) / P.pvPas);
  return pas >= 0 ? pas * P.pvCoutHausse : pas * P.pvRenduBaisse;      // négatif : des points rendus
}
export function coutVitesse(v, cadre) {
  const P = cadre.pointsClasse, pas = Number(v) - P.vitesseBase;
  return pas >= 0 ? pas * P.vitesseCoutHausse : pas * P.vitesseRenduBaisse;
}
export const sorteDe = (cap, cadre) => cadre.capacites.sortes.find((s) => s.id === cap.sorte) ?? null;
export function coutCapacite(cap, cadre) {
  const s = sorteDe(cap, cadre), base = s ? s.cout : 0;
  const renforts = (cap.renforts ?? []).reduce((t, id) => t + (cadre.capacites.renforts.find((r) => r.id === id)?.cout ?? 0), 0);
  return { base, renforts, total: base + renforts };
}
export function budgetClasse(classe, cadre) {
  const P = cadre.pointsClasse;
  const pv = coutPv(classe.pv ?? P.pvBase, cadre), vitesse = coutVitesse(classe.vitesse ?? P.vitesseBase, cadre);
  const capacites = (classe.capacites ?? []).map((c) => coutCapacite(c, cadre).total);
  const depense = pv + vitesse + capacites.reduce((a, b) => a + b, 0);
  const reste = P.total - depense;
  return { pv, vitesse, capacites, depense, total: P.total, reste };
}

// Les PV et la distance finaux : la base choisie, la Constitution, et les points qui restent (+5 PV chacun, hors plafond).
export function fiche(classe, cadre) {
  const C = budgetCaracs(classe, cadre), B = budgetClasse(classe, cadre), P = cadre.pointsClasse;
  const con = C.details.find((d) => d.id === 'CON').mod;
  const bonusCon = con * 5, bonusReste = Math.max(0, B.reste) * P.pvParPointRestant;
  const pv = Number(classe.pv ?? P.pvBase) + bonusCon + bonusReste;
  const vitesse = Number(classe.vitesse ?? P.vitesseBase);
  return { caracs: C, classe: B, pv, pvBase: Number(classe.pv ?? P.pvBase), bonusCon, bonusReste, vitesse, metres: metres(vitesse, cadre) };
}

// --- Les dégâts d'une capacité : le palier de sa sorte, +1 si elle est renforcée en dégâts -----------------------
export function palierDe(cap, cadre) {
  const s = sorteDe(cap, cadre), paliers = cadre.paliers.degats;
  if (!s?.palier) return null;
  let k = paliers.findIndex((p) => p.id === s.palier);
  if ((cap.renforts ?? []).includes('degats')) k += 1;
  return paliers[Math.min(k, paliers.length - 1)] ?? null;
}
// « 5–7 / 11–14 / 22–28 » : éraflure (moitié), touche, critique (double), avec le modificateur de la caractéristique.
export function degats(cap, classe, cadre) {
  const p = palierDe(cap, cadre);
  if (!p) return null;
  const mod = modificateur(classe.caracs?.[cap.carac] ?? cadre.caracs.base);
  const min = p.base + 1 + mod, max = p.base + p.de + mod;
  return { palier: p.id, base: p.base, de: p.de, mod, eraflure: [Math.floor(min / 2), Math.floor(max / 2)], touche: [min, max], critique: [min * 2, max * 2],
    texte: `${Math.floor(min / 2)}–${Math.floor(max / 2)} / ${min}–${max} / ${min * 2}–${max * 2}` };
}

// --- Les vérifications : « problemes » bloquent la fiche, « conseils » se discutent ------------------------------
export function verifier(classe, cadre) {
  const problemes = [], conseils = [];
  const F = fiche(classe, cadre), P = cadre.pointsClasse, caps = classe.capacites ?? [];
  if (!String(classe.nom ?? '').trim()) problemes.push({ ou: 'identite', texte: 'La classe n’a pas de nom.' });
  if (!classe.role) problemes.push({ ou: 'identite', texte: 'Choisis un rôle principal (tank, dégâts, soutien, contrôle).' });
  // les caractéristiques
  for (const d of F.caracs.details) {
    if (d.score < cadre.caracs.min || d.score > cadre.caracs.max) problemes.push({ ou: 'caracs', texte: `${d.id} ${d.score} : une caractéristique va de ${cadre.caracs.min} à ${cadre.caracs.max} au niveau 1.` });
  }
  if (F.caracs.reste < 0) problemes.push({ ou: 'caracs', texte: `${-F.caracs.reste} point${F.caracs.reste < -1 ? 's' : ''} de caractéristiques de trop (budget ${cadre.caracs.points}).` });
  else if (F.caracs.reste > 0) conseils.push({ ou: 'caracs', texte: `Il reste ${F.caracs.reste} point${F.caracs.reste > 1 ? 's' : ''} de caractéristiques à placer.` });
  // les points de classe
  if (F.pvBase < P.pvMin || F.pvBase > P.pvMax) problemes.push({ ou: 'points', texte: `Les PV de base vont de ${P.pvMin} à ${P.pvMax}.` });
  if (F.vitesse < P.vitesseMin || F.vitesse > P.vitesseMax) problemes.push({ ou: 'points', texte: `Le déplacement va de ${P.vitesseMin} à ${P.vitesseMax} cases.` });
  if (F.classe.reste < 0) problemes.push({ ou: 'points', texte: `${-F.classe.reste} point${F.classe.reste < -1 ? 's' : ''} de classe de trop (budget ${P.total}).` });
  else if (F.classe.reste > 0) conseils.push({ ou: 'points', texte: `${F.classe.reste} point${F.classe.reste > 1 ? 's' : ''} de classe non dépensé${F.classe.reste > 1 ? 's' : ''} : +${F.bonusReste} PV (hors plafond).` });
  // les capacités
  const N = cadre.capacites.nombre;
  if (caps.length !== N) problemes.push({ ou: 'capacites', texte: `Une classe part avec ${N} capacités (il y en a ${caps.length}).` });
  const bases = caps.filter((c) => c.sorte === 'base');
  if (cadre.capacites.attaqueDeBaseObligatoire && bases.length === 0) problemes.push({ ou: 'capacites', texte: 'Une des capacités doit être l’attaque de base (gratuite).' });
  if (bases.length > 1) problemes.push({ ou: 'capacites', texte: 'Une seule attaque de base.' });
  if (caps.filter((c) => c.slot === 'reaction').length > 1) problemes.push({ ou: 'capacites', texte: 'Au plus une réaction par classe.' });
  caps.forEach((c, k) => {
    const qui = c.nom?.trim() || `la capacité ${k + 1}`;
    if (!c.nom?.trim()) conseils.push({ ou: 'capacites', texte: `La capacité ${k + 1} n’a pas de nom.` });
    if (c.sorte === 'base' && (c.renforts ?? []).includes('degats')) problemes.push({ ou: 'capacites', texte: `${qui} : l’attaque de base reste au palier T1.` });
    const p = palierDe(c, cadre);
    if (p?.id === 'T3') problemes.push({ ou: 'capacites', texte: `${qui} : pas de palier T3 (22 + d8) au niveau 1.` });
    if (!sorteDe(c, cadre)) problemes.push({ ou: 'capacites', texte: `${qui} : sorte inconnue « ${c.sorte} ».` });
    if (c.sorte === 'exploitation' && !(c.utilise ?? []).length) conseils.push({ ou: 'capacites', texte: `${qui} est une exploitation : dis quel statut, quelle surface ou quelle position elle exploite.` });
    if (c.sorte === 'preparation' && !(c.cree ?? []).length) conseils.push({ ou: 'capacites', texte: `${qui} est une préparation : dis ce qu’elle crée (un statut, une surface, une poussée…).` });
  });
  const accroches = caps.some((c) => (c.cree ?? []).length || (c.utilise ?? []).length);
  if (caps.length && !accroches) problemes.push({ ou: 'capacites', texte: 'Aucune capacité ne prépare ni n’exploite un combo : c’est le cœur du jeu, il en faut au moins une.' });
  // la ressource, la faiblesse
  if (!cadre.ressources.some((r) => r.id === classe.ressource)) problemes.push({ ou: 'identite', texte: 'Choisis une ressource de la liste commune.' });
  if (!String(classe.faiblesse ?? '').trim()) problemes.push({ ou: 'faiblesse', texte: 'Une vraie faiblesse, écrite sur la fiche, est obligatoire.' });
  // l'enveloppe du rôle : un conseil, pas une règle
  const role = cadre.roles.find((r) => r.id === classe.role);
  if (role) {
    if (F.pv < role.pv[0] || F.pv > role.pv[1]) conseils.push({ ou: 'points', texte: `Un ${role.nom.toLowerCase()} a d’habitude ${role.pv[0]} à ${role.pv[1]} PV (ici ${F.pv}). Possible, mais dis pourquoi.` });
    if (F.vitesse < role.vitesse[0] || F.vitesse > role.vitesse[1]) conseils.push({ ou: 'points', texte: `Un ${role.nom.toLowerCase()} se déplace d’habitude de ${metres(role.vitesse[0], cadre)} à ${metres(role.vitesse[1], cadre)} m.` });
  }
  if (!classe.sousClasses?.some((s) => s.nom?.trim())) conseils.push({ ou: 'faiblesse', texte: 'Les deux chemins de sous-classe (niveau 3) peuvent attendre, mais note au moins leur idée.' });
  return { problemes, conseils, valide: problemes.length === 0 };
}

// --- La fiche en texte (le format de CLASS_TEMPLATE.fr.md), à coller dans une issue ou un .md ----------------------
export function ficheTexte(classe, cadre) {
  const F = fiche(classe, cadre), V = verifier(classe, cadre);
  const nomDe = (liste, id) => liste.find((x) => x.id === id)?.nom ?? id;
  const role = nomDe(cadre.roles, classe.role), res = cadre.ressources.find((r) => r.id === classe.ressource);
  const L = [];
  L.push(`# ${classe.nom || 'Sans nom'}${classe.auteur ? ` (par ${classe.auteur})` : ''}`);
  if (classe.phrase) L.push(`*${classe.phrase}*`);
  L.push('', `- **Rôle :** ${role}${classe.twist ? `, particularité : ${classe.twist}` : ''}${classe.archetype ? ` · **Archétype :** ${classe.archetype}` : ''}`);
  L.push(`- **Ressource :** ${res ? `${res.nom} (${res.remplit}, max ${res.max})` : '—'}`);
  L.push(`- **Faiblesse :** ${classe.faiblesse || '—'}`);
  L.push(`- **Caractéristiques (${F.caracs.depense}/${F.caracs.total} points) :** ${F.caracs.details.map((d) => `${d.id} ${d.score} (${signe(d.mod)})`).join(', ')}`);
  const pc = [];
  if (F.classe.pv) pc.push(`PV ${F.pvBase} (${F.classe.pv > 0 ? F.classe.pv : `rend ${-F.classe.pv}`})`);
  if (F.classe.vitesse) pc.push(`déplacement ${F.vitesse} cases (${F.classe.vitesse > 0 ? F.classe.vitesse : `rend ${-F.classe.vitesse}`})`);
  (classe.capacites ?? []).forEach((c, k) => { const t = F.classe.capacites[k]; if (t) pc.push(`${c.nom || `capacité ${k + 1}`} (${t})`); });
  if (F.classe.reste > 0) pc.push(`${F.classe.reste} restant${F.classe.reste > 1 ? 's' : ''} = +${F.bonusReste} PV`);
  L.push(`- **Points de classe (${F.classe.depense}/${F.classe.total}) :** ${pc.join(' · ') || 'rien'}. **PV : ${F.pvBase}${F.bonusCon ? ` ${signe(F.bonusCon)} (CON)` : ''}${F.bonusReste ? ` + ${F.bonusReste}` : ''} = ${F.pv}. Distance : ${F.metres} m par tour.**`);
  L.push('', '| # | Nom | Sorte | Points | Coût | Portée | Ce qu’elle fait | Lien de combo | Carac. |', '|---|---|---|---|---|---|---|---|---|');
  (classe.capacites ?? []).forEach((c, k) => {
    const d = degats(c, classe, cadre), portee = cadre.paliers.portees.find((p) => p.id === c.portee), zone = cadre.paliers.zones.find((z) => z.id === c.zone);
    const slot = nomDe(cadre.capacites.slots, c.slot), sorte = nomDe(cadre.capacites.sortes, c.sorte);
    const liens = [...(c.cree ?? []).map((id) => `crée ${nomAccroche(cadre, id)}`), ...(c.utilise ?? []).map((id) => `utilise ${nomAccroche(cadre, id)}`)].join(', ');
    const effet = [c.effet, d ? `${d.base} + d${d.de} ${signe(d.mod)} (${d.texte})` : ''].filter(Boolean).join(' · ');
    L.push(`| ${k + 1} | ${c.nom || ''} | ${sorte} (${slot.toLowerCase()}) | ${F.classe.capacites[k] ?? 0} | ${c.cout || 'aucun'} | ${portee ? `${portee.m} m` : ''}${zone && zone.rayon ? `, ${zone.nom.toLowerCase()}` : ''} | ${effet} | ${liens} | ${c.carac} |`);
  });
  if (classe.sousClasses?.some((s) => s.nom || s.idee)) {
    L.push('', '- **Sous-classes (niveau 3) :** ' + classe.sousClasses.map((s, k) => `${'AB'[k]}, ${s.nom || '?'}${s.idee ? ` (${s.idee})` : ''}`).join(' ; '));
  }
  if (classe.look && Object.values(classe.look).some(Boolean)) {
    L.push('', `- **Le look :** ${[classe.look.corps, classe.look.tenue, classe.look.touche].filter(Boolean).join(' · ')}${classe.look.lien ? ` · [générateur LPC](${classe.look.lien})` : ''}`);
  }
  if (classe.references) L.push(`- **Références :** ${classe.references}`);
  L.push('', V.valide ? `✔ Dans le cadre (${cadre.version}).` : `✘ Hors cadre : ${V.problemes.map((p) => p.texte).join(' ')}`);
  return L.join('\n');
}
export function nomAccroche(cadre, id) {
  const A = cadre.accroches;
  return A.statuts.find((x) => x.id === id)?.nom ?? A.surfaces.find((x) => x.id === id)?.nom ?? A.positions.find((x) => x.id === id)?.nom ?? id;
}
// Toutes les accroches de combo, à plat (statut, surface, position), pour les listes de l'éditeur.
export function accroches(cadre) {
  const A = cadre.accroches;
  return [...A.statuts.map((x) => ({ ...x, genre: 'statut' })), ...A.surfaces.map((x) => ({ ...x, genre: 'surface' })), ...A.positions.map((x) => ({ ...x, genre: 'position' }))];
}

// Une classe lue d'un JSON (un fichier, le presse-papier) : complétée avec les champs qui manquent, jamais plantée.
export function normaliser(brut, cadre) {
  const vide = classeVide(cadre), c = { ...vide, ...(brut && typeof brut === 'object' ? brut : {}) };
  c.caracs = { ...vide.caracs, ...(c.caracs ?? {}) };
  for (const k of CARACS) c.caracs[k] = Number(c.caracs[k]) || cadre.caracs.base;
  c.pv = Number(c.pv) || vide.pv; c.vitesse = Number(c.vitesse) || vide.vitesse;
  c.capacites = Array.isArray(c.capacites) ? c.capacites.map((x) => ({ ...capaciteVide(cadre, x?.sorte), ...x, cree: x?.cree ?? [], utilise: x?.utilise ?? [], renforts: x?.renforts ?? [] })) : vide.capacites;
  c.sousClasses = Array.isArray(c.sousClasses) && c.sousClasses.length ? c.sousClasses.map((s) => ({ nom: '', idee: '', ...s })) : vide.sousClasses;
  c.look = { ...vide.look, ...(c.look ?? {}) };
  c.id = String(c.id || identifiant(c.nom));
  return c;
}
export const identifiant = (nom) => String(nom ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'classe';
