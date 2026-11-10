# SIAGA Bunda

![SIAGA Bunda app cover](app/public/cover.png)

## Overview

SIAGA Bunda is a progressive web app for supporting the health screening of pregnant women, mothers during the postpartum period, and newborns. It is part of the 2026 PDUPT research project at Poltekkes Kemenkes Bandung.

The app combines screening, educational materials, reminders, and health tracking. It can be installed on supported mobile devices, and several features remain available offline. Screening results are informational and do not replace an examination by a health professional. Clinical rules require expert validation before use in real care.

## Features

- Pregnancy, postpartum, lactation, and newborn screening
- Green, yellow, and red result categories with follow-up guidance
- Educational materials for pregnancy and childbirth
- Pregnancy weight, supplement, ANC, and diary tracking
- Offline access with local storage and cloud synchronization
- Supabase account authentication and email verification
- PDF screening summaries for sharing with a midwife
- Web push reminders on supported browsers and devices
- Chat assistant with a local FAQ fallback

## Project Structure

```text
app/                   React PWA and frontend assets
  public/              Static assets, including cover.png
  src/
    clinical-rules/    Screening calculations
    data/              Dexie storage and Supabase sync
    features/          App screens grouped by feature
    services/          Shared app services
    shared/            Reusable components
docs/                  Product, design, and technical documentation
scripts/               Project utility scripts
supabase/
  functions/           Supabase Edge Functions
  migrations/          Database migrations
assets/                Design references and project materials
```

## Tech Stacks and Requirements

- React 19 and TypeScript
- Vite 8 and Tailwind CSS 4
- Dexie and IndexedDB for local storage
- Supabase Auth, Postgres, and Edge Functions
- Node.js 22.12 or newer and npm
- A Supabase project for cloud features

## How To Run

From the repository root, install dependencies and start the development server

```bash
cd app
npm ci
npm run dev
```

Vite prints the local development address after the server starts. To create a production build, run

```bash
npm run build
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `app/.env` to enable Supabase features. The app can still be explored locally without cloud configuration, but account and cloud features will not be available.

## How To Deploy

### Frontend

Deploy with Cloudflare Pages using these settings

| Setting | Value |
| --- | --- |
| Root directory | `app` |
| Build command | `npm run build` |
| Build output directory | `dist` |

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Cloudflare Pages production environment. These values configure the public client. Never add a Supabase service role key or an AI provider key to frontend variables.

### Supabase

Use the Supabase CLI from the repository root to connect the project

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration list
```

Review pending migrations and the target database before applying changes. Take a backup before production schema changes. Apply reviewed migrations with `npx supabase db push`. Store Edge Function secrets in the Supabase Dashboard, then deploy only the functions required by the release with `npx supabase functions deploy <function-name>`.

Before enabling production authentication, configure the production site and redirect URLs, email delivery, MFA secrets, and authentication hook in Supabase. Review [the Play Store guide](docs/DEPLOY_PLAY_STORE.md) for Android distribution.

## Contributors

| Name | Position |
| --- | --- |
| Muhammad Aufar Rizqi Kusuma | App Developer |
| Titi Legiati Praptiretno Sarwoayu, SST, M.Kes. | Principal Researcher |
| Diyan Indrayani, SST., S.Keb., Bd., M.Keb. | Associate Researcher |
| Nurdiva Mardhiyyatuz Zahro, S.Tr., Keb. | Associate Researcher |
