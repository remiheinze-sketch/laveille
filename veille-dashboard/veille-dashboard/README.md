# Veille Dashboard (Budget 2026 & PLFSS • Metz • Réseaux sociaux)

Application front en vanilla JS issue de Perplexity Labs, packagée ici pour un push GitHub direct.

## Structure
```
veille-dashboard/
  frontend/
    index.html
    style.css
    app.js
  .editorconfig
  .gitignore
  LICENSE
  README.md
  .github/
    workflows/
      ci.yml
```

## Démarrage
Ouvrir `frontend/index.html` dans votre navigateur (aucune dépendance).

## Déploiement sur GitHub Pages
Le workflow CI publie `frontend/` sur Pages à chaque push sur `main`.
Activez *Settings → Pages → Source: GitHub Actions* si nécessaire.

## Suite (backend + DB)
Une branche "feat/backend-skel" pourra être ajoutée ensuite (Express + Postgres/SQLite, jobs d’ingestion, API).
