# Next.js migration foundation

This directory contains the App Router replacement being developed alongside
the current static site. The static homepage and GitHub Pages workflows remain
the production path until the migration is ready to cut over.

From the repository root:

```sh
npm install
npm run dev
npm test
npm run build
```

Copy `next-app/.env.example` to `next-app/.env.local` when Storyblok delivery or
preview access is needed. Keep real tokens in `.env.local`; local environment
files are ignored by Git.

The existing setup and management scripts use the separate repository-root
`.env` file documented in `docs/storyblok-setup.md`. Never add the management
token to `next-app/.env.local`.
