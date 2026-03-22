---
description: Méthodologie "Automate Gemini" pour le traitement de tâches (Nécessite <Ticket_ID>)
---
Ce workflow transpose le comportement strict de l'automate de traitement de tickets développé dans ce projet (Backlog Manager) au sein d'Antigravity. Il garantit une résolution rigoureuse, contextuelle et tracée depuis l'analyse de la demande jusqu'à la mise à jour du ticket.

0. **Chargement et Lecture de la Carte (Ticket)** :
// turbo
   - A partir de l'ID fourni, utiliser une requête réseau vers l'API locale Backlog Manager (ex: `curl -s http://127.0.0.1:5000/api/cards/<ID>`) pour récupérer le JSON complet de la carte.
   - Analyser ses attributs, notamment les commentaires (pour cibler la dernière demande de l'utilisateur) et le `last_briefing` si présent dans ses clés personnalisées (indiquant une reprise de tâche).

1. **Point d'entrée du Ticket (Résumé & Dernier Commentaire)** :
   - Avant même de parcourir la description initiale du ticket, **lire prioritairement le dernier `last_briefing`** (le résumé de la dernière action IA enregistré dans les custom fields). Cet output doit suffire à comprendre le sujet en cours.
   - En parallèle, **lire le tout dernier commentaire laissé sur la carte** (dernier input humain de l'utilisateur). 
   - Ces deux éléments constituent la source de vérité et le point de départ absolu. Si (et seulement si) ce résumé n'est pas suffisant pour la compréhension globale, alors parcourir le reste de la description du ticket ou son historique.
   - Identifier le répertoire cible (projet) à partir des tags (`projet:xxx`) ou de la description pour s'y positionner.

2. **Exploration Systématique de l'Existant** :
   - Ne **jamais** faire de suppositions sur la structure du code actuel.
   - Utiliser systématiquement `view_file`, `view_file_outline` ou `list_dir` pour observer l'état réel du code **avant** d'agir.
   - Écrire toujours une brève intention ou plan d'action avant toute modification.

3. **Implémentation et Édition** :
   - Modifier les fichiers en utilisant les outils appropriés (`replace_file_content`, `multi_replace_file_content`).

4. **Validation (Sanitization)** :
// turbo
   - Lancer un formatage sur les fichiers TS/TSX touchés si possible via `npx prettier --write <fichier>`.

5. **Clôture et Mise à Jour du Ticket** :
   - Lorsque toutes les manipulations sont achevées, préparer deux contenus distincts :
     1. **Le Commentaire d'intervention** : un récapitulatif factuel listant uniquement les actions effectuées par Gemini sur le code (ex: *fichiers X et Y modifiés, bug Z corrigé via telle méthode*).
     2. **Le Briefing de reprise (`last_briefing`)** : un état des lieux destiné aux futures interventions, encapsulé par `[BRIEFING_START]` et `[BRIEFING_END]`, qui doit contenir :
        - Le contexte global sur le projet en cours et l'état actuel.
        - Le besoin actuel restant (ou l'objectif final visé).
        - Les différentes actions clés/approches expressément **validées** ou **invalidées** par l'utilisateur lors de cette session, afin de ne pas refaire les mêmes erreurs.
// turbo
   - **Mettre à jour le ticket Backlog Manager via son API** (en utilisant `curl` ou Node.js avec les endpoints `POST /api/cards/<id>` et `POST /api/cards/<id>/comments`) afin de contourner les restrictions d'édition de fichiers systèmes. Il faut :
     - Créer le **Commentaire d'intervention** décrit ci-dessus (`POST /api/cards/<id>/comments`).
     - Insérer le contenu du `[BRIEFING_START]...[BRIEFING_END]` dans la clé `last_briefing` sous `custom_fields` (`POST /api/cards/<id>`).
     - Passer le `status` de la carte à `to_test` (ou `STATUS_TO_TEST`) (`POST /api/cards/<id>`).
