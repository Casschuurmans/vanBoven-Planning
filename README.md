# Personeelsplanning Van Boven Aannemers

React + TypeScript, Supabase (database, inloggen, live updates) en Vercel (hosting).

## Online zetten via GitHub en Vercel

1. Maak een gratis account op github.com en kies **New repository** (bijvoorbeeld `vanboven-planning`, mag **Private** zijn).
2. Klik in de nieuwe repository op **uploading an existing file** en sleep alle bestanden en mappen uit deze map erin
   (`src`, `supabase`, `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `.env.example`).
   Upload **niet** de map `node_modules` en het bestand `.env`. Klik op **Commit changes**.
3. Maak een gratis account op vercel.com (inloggen met GitHub) en kies **Add New → Project**. Kies de repository en klik op **Import**.
4. Vercel herkent Vite automatisch. Open **Environment Variables** en voeg twee variabelen toe:
   - `VITE_SUPABASE_URL` = `https://rcmqjzbgobjbaznvikfb.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_raSyHOgAW3KsikrSRLJv1g_6O28jvdO`
5. Klik op **Deploy**. Na ongeveer een minuut krijg je een webadres (`...vercel.app`). Open dat en log in met een account dat je in Supabase hebt aangemaakt.

## Nieuwe collega toevoegen
Supabase → **Authentication → Users → Add user** (met "Auto Confirm User" aan).

## Lokaal draaien (alleen voor ontwikkelaars)
```
npm install
npm run dev
```
Kopieer eerst `.env.example` naar `.env`.

## Opmerkingen
- De weekplanning laadt de planning van de afgelopen 90 dagen en alles daarna. Oudere weken verschijnen leeg in het bord.
- Alle ingelogde gebruikers mogen alles wijzigen (zo gevraagd). Aanmelden zonder uitnodiging staat in Supabase uit.
