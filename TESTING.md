# TESTING — THE DARKROOM

> Lancer `pnpm dev` → ouvrir http://localhost:3000  
> Ouvrir la console navigateur (F12) pour surveiller les erreurs JS

---

## Derniers changements concrets

### Phase 1 — Sécurité (27/05/2026)
- `app/api/endorsements/route.ts` → ajout `getServerSession` + vérif que `session === endorser_handle` (bloquait les endorsements non authentifiés)
- `app/api/referrals/route.ts` → même pattern que endorsements
- `app/api/fetch-og/route.ts` → fonction `isSafeUrl()` ajoutée (bloque les attaques SSRF via URL malicieuse)
- `app/admin/opportunities/page.tsx` → vraie gate API avant accès au formulaire admin (plus de bypass frontend)
- `app/dashboard/page.tsx` → fix bug TS sur `open_to_opportunities`

### Phase 2 — Types & Cleanup (27/05/2026)
- `types/next-auth.d.ts` → créé : Session augmentée avec `handle`, `xId`, `profileImage` (plus de double cast `as any`)
- `lib/auth-options.ts` → simplifié, plus de `Session & { handle }` manuel
- 9 occurrences de `as any` supprimées dans tout le codebase
- Console.logs debug supprimés : `upload-proof` (7 logs), `goals` (4), `dashboard` (2)
- Doublon `z0renx` supprimé dans `lib/testers.ts`
- `tsc --noEmit` → **0 erreurs** ✅

### Phase 3 — Refacto dashboard (27/05/2026)
- `app/dashboard/page.tsx` : 2459 lignes → 606 lignes (-75%)
- Découpé en 9 fichiers dans `app/dashboard/` :

| Fichier | Lignes | Contenu |
|---|---|---|
| `page.tsx` | 606 | Layout + état + tabs ID/Settings |
| `WorkTab.tsx` | 680 | Onglet Work complet |
| `GoalsList.tsx` | 557 | Goals, EndorsementControls, TrendingGoals |
| `SettingsPanel.tsx` | 187 | Panel paramètres |
| `StatsPanel.tsx` | 144 | ProofRing + fonctions advice |
| `OnboardingBanner.tsx` | 103 | Bannière onboarding |
| `_Toast.tsx` | 34 | Toast + hook |
| `_types.ts` | 67 | Interfaces partagées |
| `_styles.ts` | 87 | Système de thème/cards |

- `tsc --noEmit` → **0 erreurs** après refacto ✅

---

## Checklist de tests

### 🔴 CRITIQUE — Authentification

- [ ] **1. Login Twitter/X** → `/login` → cliquer "Sign in with Twitter" → connexion complète sans erreur
- [ ] **2. Redirect non-connecté** → ouvrir `/dashboard` en navigation privée → doit rediriger vers `/login`
- [ ] **3. Handle visible** → une fois connecté, `@tonhandle` s'affiche dans le dashboard (prouve que `session.handle` est bien typé)

### 🔴 CRITIQUE — Dashboard (refactoré Phase 3)

- [ ] **4. Page load propre** → `/dashboard` charge, console = 0 erreur rouge
- [ ] **5. Score + archetype** → le score (ex: 72), l'archetype (ex: "Ghost Operator") et le tagline s'affichent (onglet ID)
- [ ] **6. Proof rings** → les 3 anneaux Social / Builder / Work s'affichent avec les bonnes valeurs
- [ ] **7. Modal advice Social** → cliquer sur le ring Social → modal s'ouvre avec "SOCIAL PROOF — X/100" + conseils
- [ ] **8. Modal advice Builder** → cliquer sur le ring Builder → idem
- [ ] **9. Analyse collapsible** → cliquer "Read analysis ↓" → le texte s'affiche / se cache
- [ ] **10. Tab Work** → cliquer sur l'onglet Work → contenu charge sans blanc/erreur
- [ ] **11. Tab Settings** → cliquer sur l'onglet Settings → contenu charge sans blanc/erreur
- [ ] **12. Tour modal** → cliquer "? Tour" en bas à droite → modal s'ouvre, Next/Back/Skip fonctionnent

### 🟠 IMPORTANT — Onglet Work

- [ ] **13. Ouvrir formulaire** → cliquer "+ Submit Your Work" → formulaire s'expand
- [ ] **14. Fetch OG** → coller une URL dans le champ Link, cliquer ailleurs → "Fetching preview…" puis disparaît
- [ ] **15. Submit proof** → remplir titre + URL + type → "Submit Proof" → card apparaît dans "YOUR WORK"
- [ ] **16. Modal détail** → cliquer une card → modal de détail s'ouvre avec le bon contenu
- [ ] **17. Edit button** → hover sur une card → bouton ✎ apparaît → cliquer → modal edit s'ouvre
- [ ] **18. Save edit** → modifier le titre → "Save changes" → card mise à jour

### 🟠 IMPORTANT — Onglet Settings

- [ ] **19. Toggles visuels** → cliquer les 3 toggles (Profile / Goals / Opportunities) → l'indicateur glisse
- [ ] **20. Theme accent** → cliquer sur violet → couleurs du dashboard changent immédiatement
- [ ] **21. Save settings** → cliquer "Save settings" → bouton passe à "Saved ✓" puis revient
- [ ] **22. Sign out** → cliquer "Sign out" → déconnecté, redirigé vers `/` ou `/login`

### 🟡 SECONDAIRE — Sécurité

- [ ] **23. Upload screenshot** → dans une GoalCard, tester upload screenshot → fichier uploadé sans erreur
- [ ] **24. API sans auth** → DevTools → Network → POST sur `/api/endorsements` sans token → réponse 401
- [ ] **25. Page publique** → aller sur `/p/tonhandle` → page charge correctement

---

## Résultat attendu

Tous les tests passent → lancer **Phase 4 : /opportunities**  
(pagination + search bar + `React.memo` sur `OpportunityCard` + Server Component pour SEO)

Si un test échoue → noter le comportement + erreur console ci-dessous.

---

## Notes de debug

<!-- Remplir ici si un test échoue -->
