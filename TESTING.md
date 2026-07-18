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

### Chantier — Vérification GitHub (14/07/2026)
- Migration `supabase/migrations/20260714_github_verification.sql` → `github_username`, `github_verified`, `github_verified_at` + index unique sur `lower(github_username)` (un compte GitHub vérifié ne peut être revendiqué que par un seul profil)
- Flow OAuth manuel (PAS un provider NextAuth — `link_github`/session Twitter existante non touchés) : `app/api/github/connect/route.ts`, `app/api/github/callback/route.ts`, `app/api/github/disconnect/route.ts`
- `app/api/settings/route.ts` : GET expose `github_username`/`github_verified`/`github_verified_at` en lecture seule — PATCH ne les accepte jamais en écriture (seule la route callback OAuth peut les modifier)
- `app/api/dashboard/route.ts`, `app/dashboard/_types.ts` : champs ajoutés au select public + `DashboardData`
- `app/dashboard/SettingsPanel.tsx` : bouton "Verify GitHub" / état "@handle ✓ Verified" + Disconnect
- `app/dashboard/page.tsx` : lit `?tab=settings` au retour du callback OAuth (nécessite maintenant un wrapper `<Suspense>` autour de `DashboardContent` — pattern déjà utilisé dans `darkroom-id/page.tsx`)
- `app/component/profile/ProfileView.tsx` : badge ✓ sur l'icône GitHub du profil public quand vérifié

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

### 🔴 CRITIQUE — Vérification GitHub

> Nécessite `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` configurés (OAuth App "Darkroom Dev", callback `http://localhost:3000/api/github/callback`)

- [ ] **26. Bouton visible** → Settings, section GitHub non vérifiée → bouton "Verify GitHub" présent
- [ ] **27. Redirect OAuth** → clic → redirection vers `github.com/login/oauth/authorize`
- [ ] **28. Callback succès** → Autoriser sur GitHub → retour `/dashboard` (tab Settings) → "@handle ✓ Verified" affiché
- [ ] **29. Persistance** → refresh la page → l'état vérifié reste affiché (lu depuis `darkroom_ids`)
- [ ] **30. Profil public** → `/p/tonhandle` → icône GitHub affiche le badge vérifié (pastille ✓)
- [ ] **31. Annulation** → cliquer "Cancel" sur l'écran GitHub → retour app sans crash, message "GitHub connection cancelled."
- [ ] **32. Compte déjà revendiqué** → tenter de vérifier un compte GitHub déjà lié à un autre profil → message "already claimed", aucune donnée corrompue
- [ ] **33. Disconnect** → bouton Disconnect → badge disparaît, `link_github` (si présent) réapparaît en fallback
- [ ] **34. Anti-spoof PATCH** → DevTools/curl → `PATCH /api/settings` avec `github_verified: true` dans le body → ne doit PAS passer `github_verified` à `true` (vérifier en DB)
- [ ] **35. Callback sans state** → appeler `/api/github/callback` directement sans cookie state → 400/redirect propre, pas de crash serveur

---

## Résultat attendu

Tous les tests passent → lancer **Phase 4 : /opportunities**  
(pagination + search bar + `React.memo` sur `OpportunityCard` + Server Component pour SEO)

Si un test échoue → noter le comportement + erreur console ci-dessous.

---

## Notes de debug

<!-- Remplir ici si un test échoue -->
