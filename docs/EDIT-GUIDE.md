# Redigeringsguide

## Skift farver
Åbn `assets/css/tokens.css`. Alle centrale farver ligger øverst som CSS-variabler.

## Skift tekster eller layout på en side
Åbn den relevante fil i `assets/js/pages/`:
- `home.js`
- `rounds.js`
- `training.js`
- `bag.js`
- `data.js`

## Ret demodata
Åbn `assets/data/demo-data.js`. Her kan handicap, køller, afstande og runder ændres.

## Tilføj en side
1. Opret en fil i `assets/js/pages/`.
2. Eksportér en funktion, som returnerer HTML.
3. Importér funktionen i `assets/js/app.js`.
4. Tilføj siden i `NAV` og `pages` i samme fil.

## Sikker arbejdsgang
1. Lav én ændring ad gangen.
2. Test lokalt med `python -m http.server 8000`.
3. Åbn browserens udviklerværktøjer med F12 og kontroller Console.
4. Commit en fungerende ændring, før næste funktion tilføjes.
