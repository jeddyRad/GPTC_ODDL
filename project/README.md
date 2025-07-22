# Frontend TaskFlow ODDL

## Structure du projet

```
src/
├── components/         # Composants réutilisables
│   ├── auth/          # Composants liés à l'authentification
│   ├── common/        # Composants génériques (Button, Modal, etc.)
│   ├── layout/        # Composants de mise en page (Header, Sidebar, etc.)
│   ├── modals/        # Boîtes de dialogue modales
│   ├── tasks/         # Composants liés aux tâches
│   └── views/         # Vues principales
├── contexts/          # Contextes React (Auth, Theme, etc.)
├── hooks/             # Hooks personnalisés
├── layouts/           # Layouts de l'application
├── pages/             # Pages de l'application
│   ├── auth/          # Pages d'authentification
│   └── dashboard/     # Pages du tableau de bord
├── router/            # Configuration du routeur
├── services/          # Services et API
├── types/             # Types TypeScript
└── utils/            # Utilitaires

## Bonnes pratiques

1. Imports
- Utiliser l'alias `@/` pour les imports (configuré dans vite.config.ts et tsconfig.json)
- Importer depuis les fichiers index.ts de chaque dossier

2. Organisation
- Un composant par fichier
- Regrouper les composants par domaine
- Séparer la logique des vues

3. Styles
- Utiliser Tailwind CSS
- Classes utilitaires pour le styling
- Thème sombre/clair supporté

4. Types
- TypeScript strict mode
- Types explicites pour les props
- Interfaces pour les modèles de données

5. État
- Contextes pour l'état global
- État local avec useState/useReducer
- Hooks personnalisés pour la logique réutilisable

6. Performance
- React.memo pour les composants purs
- useMemo/useCallback quand nécessaire
- Code splitting avec React.lazy
