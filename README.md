# Dossiercompleet + IBL

Bereken je maximale hypotheek voor 2026 conform NIBUD/AFM-normen, met optionele automatische berekening van het toetsinkomen op basis van het UWV Verzekeringsbericht (IBL Rekenregels 8.1.1).

- **Live demo**: https://`<gebruiker>`.github.io/`<repo>`/ (na deploy)
- **Stack**: React 18 + Vite + Tailwind-loze custom CSS
- **PDF parser**: pdf.js (lazy-loaded vanaf cdnjs)
- **Geen backend**: alle berekeningen gebeuren in de browser

## Snel lokaal starten

```bash
npm install
npm run dev
```

→ open http://localhost:5173

## Structuur

```
.
├── index.html                 ← entry point met SEO/Open Graph/Schema.org
├── package.json
├── vite.config.js             ← gebruikt VITE_BASE env var voor Pages-subpath
├── .nvmrc                     ← Node 20
├── .github/workflows/
│   └── deploy.yml             ← automatische deploy naar GitHub Pages
├── public/
│   ├── 404.html               ← SPA-fix voor Pages
│   ├── favicon.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   └── site.webmanifest
└── src/
    ├── main.jsx               ← React entry
    ├── App.jsx                ← intake-flow + 10 secties + result
    ├── IblIntegration.jsx     ← UWV upload + result-card + detail-modal
    ├── iblEngine.js           ← IBL Rekenregels 8.1.1 (parser + calc)
    ├── dossierEngine.js       ← NIBUD/AFM 2026 max-hypotheek + AOW + begroting
    └── dossier.css            ← styling
```

## Deploy naar GitHub Pages — stappenplan

### Stap 1 — Maak een repo

1. Ga naar [github.com/new](https://github.com/new)
2. Naam: bijv. `dossiercompleet-ibl` (of wat je wilt — onthoud de naam)
3. **Public** (gratis Pages) of Private (vereist betaald plan voor Pages)
4. **Niet** initialiseren met README/`.gitignore` — die staan al in je upload

### Stap 2 — Upload de bestanden

Via browser:
1. Klik op "uploading an existing file"
2. Sleep álle bestanden uit deze map naar GitHub (incl. de `.github/`, `public/`, `src/` mappen)
3. Commit-bericht: "Initial commit"
4. Klik "Commit changes"

Via terminal:
```bash
cd /pad/naar/uitgepakte/repo
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<gebruiker>/<repo>.git
git push -u origin main
```

### Stap 3 — Schakel Pages in

1. Ga naar **Settings** → **Pages** in je repo
2. Bij **Source**: kies "**GitHub Actions**" (NIET "Deploy from a branch")
3. Klaar — er gebeurt verder niets in deze stap

### Stap 4 — Wacht op de eerste deploy

1. Ga naar het **Actions**-tabblad in je repo
2. Je ziet een workflow run "Deploy naar GitHub Pages" (start automatisch na de push)
3. Wacht 1-2 minuten tot beide jobs (`build` + `deploy`) groen zijn
4. De URL staat onderaan de deploy-job: `https://<gebruiker>.github.io/<repo>/`

Klaar — site is live.

## Custom domein gebruiken (optioneel)

Heb je een eigen domein zoals `hypotheekcheck.nl`?

### Stap A — DNS instellen
Voeg bij je DNS-provider toe:
```
CNAME    @ of www    <gebruiker>.github.io
```
(of A-records voor Pages-IP's: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153)

### Stap B — CNAME-bestand aanmaken
Maak `public/CNAME` met als enige inhoud:
```
hypotheekcheck.nl
```
Push naar GitHub. De workflow detecteert dit automatisch en gebruikt `base: '/'` i.p.v. `/<repo>/`.

### Stap C — In GitHub Pages settings
Ga naar **Settings** → **Pages**. Vul je domein in bij **Custom domain**, vink **Enforce HTTPS** aan.

### Stap D — SEO-bestanden bijwerken
Vervang in deze bestanden `https://example.nl/` door je echte domein:
- `index.html` (8 plekken — canonical, hreflang, og:url, og:image, twitter:image, schema.org url)
- `public/sitemap.xml` (`<loc>` en hreflang)
- `public/robots.txt` (Sitemap-regel)
- `public/404.html` — wijzig `pathSegmentsToKeep = 1` naar `0`

## Privacy-disclaimer

In de Schema.org FAQ staat: *"De berekening loopt volledig in je browser — er wordt geen UWV-PDF naar servers verstuurd."* Dit klopt voor de huidige implementatie (pdf.js draait client-side, fetch-calls beperken zich tot api.pdok.nl voor adres-lookup en cdnjs.cloudflare.com voor pdf.js zelf). **Zodra je een backend toevoegt, pas je deze claim aan.**

## Bekende beperkingen

Zie `TESTRAPPORT.md` (in /home/claude/dossiercompleet-ibl/, niet in deze repo gekopieerd) voor de complete lijst. De belangrijkste:

1. **Studieschuld** wordt nog berekend met de pre-2024 hoofdsom-methode. Sinds 2024 schrijft de Rijksoverheid voor dat geldverstrekkers de werkelijke DUO-maandlast moeten gebruiken. Voor consumenten-indicaties prima, voor een hypotheekadviseurs-tool nog niet voldoende.
2. **NIBUD-tabellen** komen 1-op-1 uit Dossiercompleet — niet onafhankelijk geverifieerd tegen het officiële Nibud-rapport 2026 (afronding op 0,1% i.p.v. 0,5%).
3. **Energielabel-bonus** is mogelijk te hoog voor A++++ en A+++ (2026-bedragen verlaagd).

→ Voeg een duidelijke "indicatief, geen advies" disclaimer toe aan de result-pagina vóór je breed deelt.

## Kosten

Helemaal gratis:
- GitHub Pages voor public repo's = gratis
- Custom domein = wat je provider rekent (~€10/jaar)
- Geen server, geen database, geen tracking

## Updates pushen

Elke push naar `main` triggert automatisch een nieuwe deploy. Niets handmatigs nodig.
