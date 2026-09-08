# Golf Pulse Editable

En statisk og modulopdelt Golf Pulse-app, som kan hostes direkte på GitHub Pages.

## Hurtig redigering

- **Farver, radius og skrifter:** `assets/css/tokens.css`
- **Fælles komponentdesign:** `assets/css/components.css`
- **Layout og navigation:** `assets/css/app.css`
- **Profil og demodata:** `assets/data/demo-data.js`
- **Hver side:** `assets/js/pages/`
- **CSV/JSON-import:** `assets/js/core/importers.js`
- **Navigation og events:** `assets/js/app.js`

## Lokal test

ES-moduler kræver en lokal webserver. Kør i projektmappen:

```bash
python -m http.server 8000
```

Åbn `http://localhost:8000`.

## GitHub Pages

Upload hele mappestrukturen til repositoryets rod. Vælg derefter **Settings > Pages > Deploy from a branch > main > / (root)**.

## Vigtigt

Gem aldrig Garmin-brugernavn, adgangskode eller tokens i repositoryet. Importér kun de genererede datafiler.
