// ─────────────────────────────────────────────────────────────────────────────
// LA CLÉ DE STOCKAGE DE LA RADIO (export de Mastres Racing, 2026-10-19)
//
// Dans Mastres Racing, Radio.ts lisait `storageKey` de src/storage.ts (le préfixe
// commun à toutes les données du jeu dans localStorage). Ce petit module le
// remplace pour que la radio n'ait aucune dépendance hors de src/audio/ : la
// radio n'y garde qu'une chose, le décalage de chaque station après « morceau
// suivant » (voir Radio.ts, SKIPS_KEY). Changer PREFIX pour suivre la
// convention du projet d'accueil (une clé par jeu, pour ne pas mélanger deux
// jeux servis sur le même domaine).
// ─────────────────────────────────────────────────────────────────────────────

/** Le préfixe des clés de la radio dans localStorage. */
const PREFIX = 'dungeoncoop:';

/** La clé complète d'une donnée de la radio : storageKey('radio-skips') = 'radio:radio-skips'. */
export function storageKey(name: string): string {
  return PREFIX + name;
}
