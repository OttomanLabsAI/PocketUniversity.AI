# PocketUniversity.AI

Tutorials and guides in practical AI, from the OttomanLabs.AI studio. This is
the sister site to [ottomanlabs.ai](https://ottomanlabs.ai/) and shares its
boxed-mosaic design system — black on white, Flux for the brand and caps,
Newsreader for the serif, Prata for the display words. A website first; an
iOS app is planned to follow.

## What is on the page

- **AI & Automation for Architecture, Engineering and Construction** — The
  Gherkin and Dymak HQ, each painted on its floating voxel island, linking to
  the concept-design dashboards, the Gherkin studio and the Dymak tutorial on
  ottomanlabs.ai.
- **Finance & Investing** — PyBuffet and Fadil's Stock Picks.
- **AI Image & Video** — the AI-generated teasers (Lord of the Rings, Pokémon,
  Charizard on the Thames) with the popup player, and the Educational Videos
  pipeline card.
- **General AI** — Claude Code Certification Training, coming soon.
- **The Studio** — GitHub, the news signup, the Reading Room, ways to follow,
  the CV, YouTube, the CV Builder and Under the Hood.
- **Apps** — VisualNeuroscience.AI, the browser-based 3D brain atlas.

## Structure

A Cloudflare Workers static-assets site. Everything served lives in `public/`
and there is no build step — the files in that directory are the site.

```
public/
  index.html               the home page
  404.html                 themed not-found page
  favicon.svg / .ico       the mortarboard-and-sparkle mark
  robots.txt, sitemap.xml
  _headers                 security + caching headers
  assets/
    css/styles.css         the shared design system (from OttomanLabs.AI)
    css/home.css           section dividers, rails, popup player, app cards
    css/notfound.css       the 404 box
    js/theme-init.js       restores a saved dark theme before first paint
    js/site-header.js      the one masthead + the light/dark toggle
    js/islands.js          paints the Gherkin and Dymak HQ island cards
    js/home.js             rails, card videos, popup player, news signup
    fonts/                 Flux (embedded)
    img/                   logos, favicon PNG, the Open Graph image
    video/                 the AI Image & Video teasers, full videos, posters
wrangler.jsonc             assets-only config, no Worker script
package.json               wrangler devDependency + dev/deploy scripts
```

## Local development

```bash
npm install
npm run dev          # wrangler dev — serves public/ on localhost
```

## Verification before a push

1. `npx wrangler deploy --dry-run` — the config check.
2. Serve `public/`, render it with headless Chromium at desktop and phone
   widths, and look at the screenshots: styles applied, fonts loaded, the
   island canvases painted, layout intact.

## Deployment

The repo is connected to Cloudflare Workers Builds, so every push to `main`
deploys to production. To connect it the first time: Cloudflare dashboard →
Workers & Pages → Create → Import a repository, pick this repo, keep the
defaults (`wrangler.jsonc` carries the config, there is no build command), then
attach the `pocketuniversity.ai` custom domain to the Worker.

## External resources

- **Google Fonts** — Afacad Flux, Newsreader and Prata load from
  fonts.googleapis.com; Flux is embedded in `assets/fonts/`.
- **ottomanlabs.ai** — the tutorials, dashboards, PyBuffet, Stock Picks, the
  Reading Room, the CV Builder, Under the Hood, the contact page and the CV
  all live there; the cards on this page link across.
- **Mailchimp** — the news signup posts to the same list as OttomanLabs.AI.
  It tries `/api/subscribe` first (the first-party relay the main site runs),
  and since this site is static assets only that hop answers 404 and the
  signup goes straight to Mailchimp's JSONP endpoint instead.
- **VisualNeuroscience.AI** — linked from the Apps section.
