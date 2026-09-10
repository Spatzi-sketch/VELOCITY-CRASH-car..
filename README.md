# Velocity Crash

Ein rundenbasiertes Ein-Tasten-Bremsduell (React + Vite + Tailwind CSS v4) als reine
Static-SPA. Alle Fortschritte (Münzen, Rekorde, Einstellungen, Freischaltungen, Sprache)
liegen im `localStorage` des Browsers — **kein Backend, keine Datenbank, keine
Environment-Variablen**. Genau deshalb ist der Deployment-Aufwand minimal.

## Projektstruktur (wichtig!)

Alle Dateien liegen **direkt im Repository-Root** — Vercel findet sonst kein Projekt und
liefert einen 404:

```
.
├── index.html          <- Vite-Einstieg
├── package.json
├── package-lock.json
├── vercel.json         <- Vercel-Konfiguration
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── 404.html
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/
    └── game/
```

> **Falls dein Repo nur eine ZIP-Datei enthält:** das ist die Ursache für den 404. Vercel
> baut keine ZIP-Archive aus — es braucht die Quelldateien im Root. Dieses Repo ist bereits
> entpackt, du also auf dem richtigen Stand.

## Lokal entwickeln

```bash
npm install
npm run dev      # http://localhost:5173
```

## Bauen / prüfen

```bash
npm run build      # erzeugt dist/index.html (alles inline, eine Datei)
npm run preview    # baut + serviert das Produktions-Ergebnis lokal
npm run typecheck  # TypeScript-Prüfung ohne Build
```

Dank `vite-plugin-singlefile` besteht das Build-Ergebnis aus **einer einzigen**
`dist/index.html` (JS + CSS sind inline). Es gibt keine `/assets/*`-Dateien, damit kann auch
bei einem Subpfad oder Cache-Problem nichts "fehlen".

## Auf Vercel veröffentlichen (empfohlen: per Git)

1. Dieses Repo zu GitHub pushen (`git push origin main`).
2. Auf [vercel.com/new](https://vercel.com/new) → **Add New → Project** → GitHub-Repo importieren.
3. Prüfen, dass diese Werte stehen (sie stehen schon so in `vercel.json`):
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
   - **Root Directory:** leer bzw. `.`  ← *kritisch, siehe unten*
4. **Deploy**. Keine Environment-Variablen nötig.

Jeder Push auf `main` deployed automatisch neu.

## Wenn es trotzdem 404 heißt

Vercel zeigt "The Deployment could not be found" fast immer aus diesen Gründen:

| Symptom | Ursache | Fix |
| --- | --- | --- |
| 404 auf der Domain, Build "Ready" | **Root Directory** zeigt auf einen Unterordner (z. B. `develop-velocity-crash-game`) | Vercel → *Settings → General → Root Directory* auf `./` stellen |
| 404, Build "Failed" | Im Repo liegen nur `archive/*.zip` statt Quellcode | Quelldateien ins Repo-Root committen (hier erledigt) |
| Build-Fehler `You are using Node.js 18` | Vite 7 braucht Node ≥ 20.19 | Vercel → *Settings → Environment Variables* → `NODE_VERSION` = `22` |
| Beim Reload einer URL: 404 | SPA-Rewrite fehlt | ist in `vercel.json` (`rewrites` → `/index.html`) vorhanden |
| Altes Bild nach Update | Index-Cache | `Cache-Control`-Header in `vercel.json` gesetzt; notfalls hart neu laden |

## Alternative ohne Git: Ordner hochladen

Falls du Vercel nicht mit GitHub verbinden willst:

```bash
npm install
npm run build
```

Dann im Browser auf [vercel.com/new](https://vercel.com/new) → **Deploy your app** →
den Ordner **`dist`** per Drag-and-drop hochladen. Wegen `base: "./"` läuft das Spiel auch
unter jeder beliebigen URL. Für Subpfad-Deployments einfach `dist/index.html` als
`index.html` beibehalten — mehr braucht es nicht.

## Hinweise

- Kein `DATABASE_URL`, kein Prisma, keine API-Routen, keine ESLint-Tools im Build-Pfad.
- Persistenz ausschließlich unter den `velocity-crash-*`-Keys im `localStorage`.
- Das `archive/`-Verzeichnis ist per `.gitignore` ausgeschlossen; die ursprünglich
  hochgeladene ZIP liegt dort nur lokal und wird nicht mit deployed.
