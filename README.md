# r3d/ops — Red Team Knowledge Base

> **KBM Security** — Offensive security tutorials, scripts & playbooks for authorized engagements.
> Live at [kbmsecurity.com.br/blog](https://www.kbmsecurity.com.br/blog)

```
root@kbm-security:~/r3d/ops$ cat README.md
[OK] Loading documentation...
```

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | [Astro 4.x](https://astro.build) | Vite-powered SSG |
| Styling | [Tailwind CSS 3.x](https://tailwindcss.com) | Terminal dark theme |
| Content | Astro Content Collections | Type-safe MDX/Markdown |
| Syntax Highlight | Shiki (built-in) | Build-time, zero runtime cost |
| Search | [Orama 2.x](https://orama.com) | In-browser full-text search |
| UI Islands | React 18 | Search modal + TOC only |
| Hosting | GitHub Pages | Static output at `/blog` |
| CI/CD | GitHub Actions | Auto-deploy on push to `main` |

---

## Quick Start

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x

### Install & Run

```bash
# Clone the repository
git clone https://github.com/kbmsecurity/kbm.blog.git
cd kbm.blog

# Install dependencies
npm install

# Start the dev server
npm run dev
# → http://localhost:4321/blog/
```

### Build

```bash
# Production build
npm run build
# Output: dist/

# Preview the production build locally
npm run preview
# → http://localhost:4321/blog/
```

---

## Project Structure

```
kbm.blog/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD
├── public/
│   └── favicon.svg             # Site favicon
├── src/
│   ├── components/
│   │   ├── BaseHead.astro      # SEO, OG tags, fonts
│   │   ├── TopNav.astro        # Fixed navigation + mobile menu
│   │   ├── Footer.astro        # Site footer with links
│   │   ├── PostCard.astro      # Blog post preview card
│   │   ├── TagBadge.astro      # Category / difficulty / OS badge
│   │   ├── Callout.astro       # Info / warn / danger / tip boxes
│   │   ├── Breadcrumb.astro    # Auto breadcrumb navigation
│   │   ├── Search.tsx          # Orama search modal (React island)
│   │   └── TOC.tsx             # Scroll-tracked table of contents (React island)
│   ├── content/
│   │   ├── config.ts           # Content collections schema (Zod)
│   │   └── posts/
│   │       ├── recon/          # Reconnaissance posts
│   │       ├── privesc/        # Privilege escalation posts
│   │       ├── lateral/        # Lateral movement posts
│   │       ├── exfil/          # Exfiltration posts
│   │       ├── evasion/        # AV/EDR evasion posts
│   │       ├── web/            # Web attack posts
│   │       └── cloud/          # Cloud security posts
│   ├── layouts/
│   │   ├── BaseLayout.astro    # Root layout with nav, footer, copy buttons
│   │   └── PostLayout.astro    # Article layout with TOC, MITRE card, related posts
│   ├── pages/
│   │   ├── index.astro         # Homepage — hero, categories, recent posts
│   │   ├── post/
│   │   │   └── [...slug].astro # Individual post page (dynamic)
│   │   ├── tags/
│   │   │   └── [tag].astro     # Tag / category filter page (dynamic)
│   │   ├── feed.xml.ts         # RSS/Atom feed
│   │   └── search-index.json.ts# Orama search index (build-time JSON)
│   ├── styles/
│   │   └── global.css          # Global styles, terminal theme, prose
│   └── utils/
│       └── content.ts          # Helpers: sorting, filtering, MITRE, URL builders
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

---

## Writing Content

### Creating a New Post

1. Create a Markdown file inside the appropriate category folder:

```
src/content/posts/<category>/<slug>.md
```

2. Add the required frontmatter:

```yaml
---
title: "Your Post Title"
date: 2025-03-01
description: "One-sentence summary (max 300 chars)."
category: privesc          # recon | privesc | lateral | exfil | evasion | web | cloud
os: [linux]                # linux | windows | macos | all (array)
difficulty: medium         # easy | medium | hard | expert
mitre_tactic: TA0004       # optional — MITRE ATT&CK Tactic ID
mitre_technique: T1548.001 # optional — MITRE ATT&CK Technique ID
tags: [suid, linux, privesc, gtfobins]
status: published          # draft | published
readingTime: 8             # optional — auto-calculated if omitted
---
```

3. Write your content in Markdown below the frontmatter.

4. Set `status: draft` to hide from public routes during writing.

### Content Guidelines

- **Code blocks** — use fenced code blocks with language identifiers for syntax highlighting:
  ````
  ```bash
  find / -perm -u=s -type f 2>/dev/null
  ```
  ````
  Supported: `bash`, `python`, `powershell`, `go`, `c`, `ruby`, `sql`, `yaml`, `json`, and [200+ more](https://shiki.matsu.io/languages).

- **Callouts** — use blockquotes with special prefixes:
  ```markdown
  > **DANGER:** This technique should only be used in authorized environments.
  ```

- **MITRE links** — if `mitre_tactic` and `mitre_technique` are set in frontmatter, the post automatically renders a MITRE ATT&CK badge and sidebar card.

- **Images** — place in `public/assets/posts/<slug>/` and reference as `/blog/assets/posts/<slug>/image.png`.

### Auto-Translation to English (EN-US)

Posts ending in `.md` and flagged with `lang: pt` can be automatically translated using DeepL. This script is safe and protects your bash/code blocks from being mangled.

1. Ensure your original post is in Portuguese and has `lang: pt` in its frontmatter.
2. Create or verify a `.env` file at root level containing: `DEEPL_API_KEY=your_key`.
3. Run the translator script:

```bash
# Translates all .md and .mdx files (PT-BR) and generates -en.md (EN-US) files automatically 
node -r dotenv/config scripts/translate-posts.mjs

# Dry run (test which files will be processed without consuming API quota)
node -r dotenv/config scripts/translate-posts.mjs --dry-run
```

The script will automatically generate a new `-en.md` post identical to your original one with all tags properly maintained, skipping translations if the `-en.md` file already exists.

### Categories

| Category | Description |
|----------|-------------|
| `recon` | Reconnaissance & OSINT |
| `privesc` | Privilege Escalation |
| `lateral` | Lateral Movement |
| `exfil` | Exfiltration |
| `evasion` | AV/EDR Evasion |
| `web` | Web Application Attacks |
| `cloud` | Cloud Security |

---

## URL Structure

| URL | Description |
|-----|-------------|
| `/blog/` | Homepage — hero, categories, recent posts |
| `/blog/post/<category>/<slug>` | Individual post |
| `/blog/tags/<tag>` | Posts filtered by tag |
| `/blog/tags/<category>` | Posts filtered by category |
| `/blog/feed.xml` | RSS feed |
| `/blog/search-index.json` | Orama search index |
| `/blog/sitemap-index.xml` | XML sitemap (auto-generated) |

---

## Deployment (GitHub Pages)

The repository uses GitHub Actions to build and deploy automatically on every push to `main`.

### GitHub Repository Setup

1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. No additional configuration needed — the workflow handles everything.

### Manual Deploy

```bash
# Build
npm run build

# The dist/ folder is the static output
# Deploy it to any static hosting provider
```

### GitHub Actions Workflow

The workflow at `.github/workflows/deploy.yml`:

1. Triggers on push to `main`
2. Runs `npm ci` + `npm run build`
3. Uploads `dist/` as a GitHub Pages artifact
4. Deploys to GitHub Pages

---

## Configuration

### Base URL

The blog is served at `/blog/` (configured in `astro.config.mjs`):

```js
export default defineConfig({
  site: 'https://www.kbmsecurity.com.br',
  base: '/blog',
  // ...
});
```

To run at the root domain instead, remove `base: '/blog'`.

### Shiki Theme

Change the code block theme in `astro.config.mjs`:

```js
markdown: {
  shikiConfig: {
    theme: 'one-dark-pro', // any Shiki bundled theme
  },
},
```

---

## Development

### Adding a Component

All components live in `src/components/`. Astro components (`.astro`) are zero-JS by default. Use React (`.tsx`) only when client-side interactivity is needed (search modal, TOC scroll tracking).

### Modifying the Theme

Terminal colors are defined in two places:

- `tailwind.config.mjs` — Tailwind custom color tokens (e.g. `term-green`, `term-red`)
- `src/styles/global.css` — CSS custom properties (e.g. `var(--green)`, `var(--bg)`)

Both must stay in sync.

### Search Index

The search index at `/blog/search-index.json` is generated at build time from all published posts. It's loaded lazily when the user opens the search modal (`Ctrl+K` / `Cmd+K`). No server required.

---

## Legal

All content published on r3d/ops is intended exclusively for:

- Security professionals conducting **authorized** penetration tests or red team engagements
- Students and researchers in **controlled lab environments**
- CTF (Capture the Flag) competition participants

**Unauthorized use of these techniques against systems you do not own or have explicit written permission to test is illegal under computer fraud laws in most jurisdictions.**

KBM Security assumes no liability for misuse of any content published on this platform.

---

## License

Content © KBM Security. All rights reserved.

Code (blog platform) — MIT License. See `LICENSE`.

---

## Contact

- **Website:** [kbmsecurity.com.br](https://www.kbmsecurity.com.br)
- **Email:** redteam@kbmsecurity.com.br
- **LinkedIn:** [@kbmsecurity](https://linkedin.com/company/kbmsecurity)
- **Instagram:** [@kbmsecurity](https://instagram.com/kbmsecurity)

---

```
root@kbm-security:~/r3d/ops$ _
```
