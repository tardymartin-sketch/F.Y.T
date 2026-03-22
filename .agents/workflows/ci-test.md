---
description: Lancer les tests e2e et réparer les erreurs de syntaxe automatiquement
---

1. Exécute la commande de test e2e : `npx playwright test tests/login.spec.ts`.
// turbo

2. **EN CAS DE SUCCÈS** : 
Affiche simplement un grand indicateur de réussite visuel et chaleureux (ex: "✅ **SUCCÈS : L'application fonctionne parfaitement et les tests sont validés !**") et arrête le workflow.

3. **EN CAS D'ÉCHEC** : 
L'application a probablement crashé à cause d'une erreur de code (syntaxe, formatage, accolade).
Exécute la vérification de type de TypeScript avec la commande `npx tsc --noEmit` pour balayer tout le projet et identifier immédiatement l'erreur de syntaxe. (Alternativement, si tu as le ProcessID du terminal où tourne Vite, utilise l'outil `read_terminal` pour lire l'erreur).
// turbo

4. Analyse le terminal ou la console pour trouver le fichier fautif et le message d'erreur exact.

5. Utilise l'outil `view_file` pour lire le fichier concerné autour de la ligne indiquée par l'erreur.

6. Apporte la correction nécessaire au code (correction d'accolade, de nom de variable ou de parenthèse) via l'outil `replace_file_content`.

7. Relance l'étape 1 pour t'assurer que l'application ne crash plus et que le test passe.
