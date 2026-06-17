# Resume

An AI-powered LaTeX résumé builder built with the [DeepSpace SDK](https://github.com/deepdotspace).

**Live: [resume.app.space](https://resume.app.space)**

## Features

- LaTeX résumé templates (Modern, Europass, Academic CV, Two-Column, Jake's)
- Cloud compilation (pdfLaTeX, XeLaTeX, LuaLaTeX) with live PDF preview
- AI editing assistant — multi-turn tool use over your own resume records
- Job-description tailoring (per-section rewrites that don't invent facts)
- Profile system — save a master profile, generate targeted résumés from it
- Version history with PDF snapshots
- Override mode — drop into raw LaTeX for full control

## Development

```bash
npm install
npm run dev
```

## Testing

All `deepspace test` runs need a one-time `npx deepspace login` (it provisions
dev workers). After that:

```bash
npm test            # default suite (smoke + api) — runs signed-out, no test accounts needed
npm run test:e2e    # adds the authenticated specs (collab.spec.ts)
```

The authenticated specs sign in through the SDK's `users` fixture, which uses
the local test-account pool (public signup is disabled by design). Provision it
once before running `test:e2e`:

```bash
npx deepspace login   # one-time, also required for `npm test`
npx deepspace test-accounts create --email test-1-$(date +%s)@deepspace.test --password Pass123! --name "Test User 1"
npx deepspace test-accounts create --email test-2-$(date +%s)@deepspace.test --password Pass123! --name "Test User 2"
```

## Deployment

```bash
npm run deploy
```
