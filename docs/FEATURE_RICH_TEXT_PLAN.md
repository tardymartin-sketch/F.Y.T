# Plan d'Action : Blocs de Texte Riche & Schémas (Lexical + Excalidraw)

Ce document cadre l'implémentation de la fonctionnalité permettant d'ajouter du texte riche et des schémas tactiques dans les séances et exercices de F.Y.T.

## 1. Analyse & Objectifs
*   **Coach :** Pouvoir insérer des blocs pédagogiques (consignes illustrées, schémas de placement) via un éditeur WYSIWYG.
*   **Athlète :** Consulter ces blocs de manière fluide sur mobile, sans impact majeur sur les performances.
*   **Localisation :** 
    *   Entre deux exercices dans une séance (`session_text_blocks`).
    *   À l'intérieur d'un exercice (`exercises.coach_instructions`).

## 2. Architecture Technique
*   **Source de vérité :** JSON sérialisé de Lexical (stocké en DB sous forme de `TEXT`).
*   **Éditeur :** Lexical avec un nœud personnalisé `ExcalidrawNode`.
*   **Performance :** Lazy loading systématique d'Excalidraw.
*   **Types :** Utilisation de l'union `SessionItem = SessionExercise | SessionTextBlock`.

## 3. Plan d'Exécution (Workflow AGENTS.md)

### Étape 1 : Planification & Design (TERMINÉ)
- [x] Installation de `@excalidraw/excalidraw`.
- [x] Mise à jour de `types.ts` avec `SessionTextBlock` et `SessionItem`.
- [x] Création de `ExcalidrawNode.tsx` et `RichTextEditor.tsx`.
- [x] Création de la story Storybook pour l'éditeur.

### Étape 2 : Design Isolé - Rendu (PRIORITÉ)
- [ ] **Créer `src/components/shared/Lexical/RichTextRenderer.tsx`** :
    - Version "Light" de Lexical sans barre d'outils.
    - Mode lecture seule (`editable: false`).
    - Gestion du fallback si le contenu est du texte brut (compatibilité legacy).
- [ ] Documenter le rendu dans Storybook.

### Étape 3 : Intégration Services (Câblage)
- [ ] Mettre à jour `src/services/supabaseService.ts` (ou `sessionService.ts`) :
    - `fetchSessionItems(templateId)` : Récupère et fusionne exercices et blocs de texte triés par position.
    - `upsertSessionTextBlock(block)` : Sauvegarde d'un bloc de texte.
- [ ] Gérer la suppression et le réordonnancement (Drag & Drop logique).

### Étape 4 : Intégration UI Coach (ProgramEditor)
- [ ] Ajouter le bouton "+ Bloc de texte" dans l'éditeur de programme.
- [ ] Intégrer `RichTextEditor` dans la vue d'édition.
- [ ] Permettre l'édition des `coach_instructions` d'un exercice via Lexical.

### Étape 5 : Intégration UI Athlète (ActiveSession)
- [ ] Adapter la boucle de rendu de `ActiveSession.tsx` pour utiliser `RichTextRenderer` lorsqu'un `isTextBlock` est détecté.
- [ ] Optimiser l'affichage mobile des schémas Excalidraw (zoom/responsive).

### Étape 6 : Validation E2E
- [ ] Créer un test Playwright : `tests/rich-text.spec.ts`.
- [ ] Scénario : "Création d'un schéma par le coach -> Visualisation par l'athlète".

## 4. Points de vigilance (Expertise Staff)
*   **Poids du bundle :** S'assurer que `@excalidraw/excalidraw` ne se retrouve pas dans le bundle principal de l'athlète (vérification via `import.meta.env.DEV` ou analyse de build).
*   **Sécurité RLS :** Vérifier que les politiques RLS sur `session_text_blocks` permettent bien la lecture à l'athlète assigné à la séance.
