// ============================================================
// Mocks Supabase pour Playwright
// tests/fixtures/supabase-mocks.ts
//
// Pourquoi : On ne veut PAS dépendre d'un Supabase réel pendant les tests E2E.
// On intercepte les requêtes HTTP que le SDK Supabase envoie au backend
// et on renvoie des réponses simulées. C'est rapide, déterministe, isolé.
//
// Comment ça marche :
//   page.route(pattern, handler) → toute requête matchant `pattern` est
//   interceptée AVANT d'atteindre le réseau, et `handler` décide quoi répondre.
// ============================================================

import { Page, Route } from '@playwright/test';

// ID stable pour le user démo mocké — utilisé partout dans les mocks
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Profil démo retourné par les routes `/rest/v1/profiles`.
 * Structure alignée avec ce que `authApi.getUserProfile` attend (cf src/services/api/auth.api.ts).
 */
export const DEMO_PROFILE = {
  id: DEMO_USER_ID,
  username: 'Demo Athlete #0001',
  first_name: 'Demo',
  last_name: 'Athlete',
  email: '',
  role: 'athlete',
  coach_id: null,
  created_at: new Date().toISOString(),
  weight: 70,
  is_demo: true,
};

/**
 * Réponse simulée pour `supabase.auth.signInAnonymously()`.
 * Le SDK Supabase stocke cette session dans localStorage automatiquement,
 * ce qui permet au reload qui suit (window.location.reload dans Auth.tsx)
 * de retrouver une session valide via `supabase.auth.getSession()`.
 */
function buildAnonymousAuthResponse() {
  return {
    access_token: 'fake-access-token-for-tests',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'fake-refresh-token-for-tests',
    user: {
      id: DEMO_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: '',
      phone: '',
      is_anonymous: true,
      app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Installe les mocks nécessaires pour qu'un parcours "Mode démo" se déroule
 * sans appel Supabase réel.
 *
 * À appeler AVANT `page.goto(...)` pour que les mocks soient actifs dès le 1er rendu.
 */
export async function mockDemoSession(page: Page): Promise<void> {
  // 1. signInAnonymously → POST sur l'endpoint Supabase auth
  //    URL exacte selon le SDK : /auth/v1/signup avec body { ..., is_anonymous: true }
  //    On matche large pour couvrir les variantes (signup, token, otp).
  await page.route('**/auth/v1/signup**', (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildAnonymousAuthResponse()),
    });
  });

  // 2. profiles.upsert → POST /rest/v1/profiles (avec ?on_conflict=id)
  //    Le SDK Supabase utilise POST + header Prefer: resolution=... pour upsert.
  //    On distingue lecture (GET) / écriture (POST) par la méthode HTTP.
  await page.route('**/rest/v1/profiles**', (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      // loadUserProfile() → GET /rest/v1/profiles?id=eq.<id>&select=...
      // ou hasAthletes()    → GET /rest/v1/profiles?coach_id=eq.<id>&select=*&head=true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        // Pour le single() de getUserProfile, on retourne un array d'un élément.
        // PostgREST applique .single() côté client, on est bons.
        body: JSON.stringify([DEMO_PROFILE]),
        headers: {
          'Content-Range': '0-0/1', // header utilisé par PostgREST pour le count
        },
      });
    }

    // POST (insert/upsert) → 201 Created avec le profil
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify([DEMO_PROFILE]),
    });
  });

  // 3. demo_sessions.insert → POST /rest/v1/demo_sessions
  await page.route('**/rest/v1/demo_sessions**', (route: Route) => {
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'demo-session-1', profile_id: DEMO_USER_ID }]),
    });
  });

  // 4. Catch-all pour TOUTES les autres tables Supabase consultées au démarrage
  //    (training_plans, exercise_logs, week_organizers, athlete_groups, etc.)
  //    On répond systématiquement par un array vide. L'app affiche "rien à faire"
  //    ce qui est OK pour ce 1er test (on vérifie juste qu'on arrive sur l'accueil).
  await page.route('**/rest/v1/**', (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
        headers: { 'Content-Range': '0-0/0' },
      });
    }
    // Pour toute écriture imprévue → 201 vide
    return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
  });

  // 5. Catch-all auth (refresh token, user info, etc.)
  await page.route('**/auth/v1/**', (route: Route) => {
    if (route.request().method() === 'GET' && route.request().url().includes('/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildAnonymousAuthResponse().user),
      });
    }
    // Fallback : 200 vide
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}
