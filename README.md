# Golf Pulse Editable

En statisk og modulopdelt Golf Pulse-app, som kan hostes direkte på GitHub Pages.

https://allangraver.github.io/Golf-Genie/

## Funktioner

- Dashboard med handicap og mål-handicap
- Personlig profil gemt lokalt i browseren
- Import af Garmin-runder
- Import af TrackMan-data
- Analyse af bag og klubdistanser
- Træningsforslag baseret på data
- Fuldt klientbaseret løsning uden server

## Navigation

- Home
- Runder
- Træning
- Bag
- Data
- Profil

## Profil

Profilsiden giver mulighed for at gemme personlige oplysninger direkte i browseren.

Følgende oplysninger gemmes:

```json
{
  "handicap": 12.7,
  "targetHandicap": 10.0,
  "homeCourse": "Aarhus Golf Club",
  "handedness": "Right",
  "age": 42
}
```

Profilen gemmes automatisk som en del af applikationens state i Local Storage.

## Hurtig redigering

| Område | Fil |
|----------|----------|
| Farver, radius og skrifter | `assets/css/tokens.css` |
| Fælles komponentdesign | `assets/css/components.css` |
| Layout og navigation | `assets/css/app.css` |
| Demodata | `assets/data/demo-data.js` |
| Profilside | `assets/js/pages/profile.js` |
| Forside | `assets/js/pages/home.js` |
| Runder | `assets/js/pages/rounds.js` |
| Træning | `assets/js/pages/training.js` |
| Bag | `assets/js/pages/bag.js` |
| Data | `assets/js/pages/data.js` |
| State og Local Storage | `assets/js/core/storage.js` |
| CSV/JSON-import | `assets/js/core/importers.js` |
| Navigation og events | `assets/js/app.js` |

## Lokal test

ES-moduler kræver en lokal webserver.

Kør i projektmappen:

```bash
python -m http.server 8000
```

Åbn derefter:

[Åbn lokal installation](http://localhostpload hele projektet til repositoryets rod.

Aktivér derefter:

**Settings → Pages → Deploy from a branch → main → /(root)**

Når GitHub Pages er aktiv, vil appen være tilgængelig på:

```text
https://DIT-BRUGERNAVN.github.io/DIT-REPOSITORY/
```

Eksempel:

```text
https://allangraver.github.io/golf-pulse-editable/
```

## Dataopbevaring

Golf Pulse gemmer alle brugerdata lokalt i browseren.

Data lagres under:

```javascript
golfpulse-editable-v1
```

Strukturen indeholder blandt andet:

```javascript
{
  page,
  clubs,
  rounds,
  clubIndex,
  profile,
  status
}
```

## Nulstilling

Vælges "Gendan demodata", nulstilles:

- profiler
- runder
- bag-data
- importeret TrackMan-data

til standardværdierne defineret i:

```text
assets/js/core/storage.js
```

## Sikkerhed

Gem aldrig:

- Garmin-brugernavn
- Garmin-adgangskode
- Garmin tokens
- API-nøgler

i repositoryet.

Importér kun eksporterede datafiler.

## Kildekode

Projektstruktur:

```text
assets/
├── css/
├── data/
├── js/
│   ├── components/
│   ├── core/
│   └── pages/
├── docs/
├── index.html
└── README.md
```
