# joseisaudio — Jose Angulo's game audio portfolio

Static HTML, CSS and JavaScript, generated with Node.js 22+ and hosted on Netlify. There are no npm dependencies and no client framework.

```sh
npm run build
npm test
npm run check
npm run preview
```

Publish **`dist/`**, not the repository root. `netlify.toml` sets the build command and publish directory. The build includes the 25 canonical HTML pages, redirects, headers, `robots.txt`, `sitemap.xml` and supplementary `llms.txt`. The output is generated and ignored by Git; do not edit it directly.

`npm run test:browser` runs Chrome headlessly, checks every page without JavaScript, exercises navigation/audio and captures desktop/mobile views. Set `CHROME_PATH` if Chrome is installed outside the default path. Test captures are written to `.artifacts/`. Existing baseline captures, if present, are used to compare element geometry and styling.

## Editing content

- `index.html`: shared section content and visual shell. The build replaces its SEO metadata and generates each section with its own primary heading and active content.
- `games.json`: project descriptions, images, credits and explicit stable URL slugs. Keep a project's slug when editing its title; add a redirect if a slug must change.
- `posts.json`: published article list and the existing visible listing descriptions.
- `blog/*.html`: article source documents. Only posts listed in `posts.json` are published. `test-post-1.html` is an unpublished example, not a production page.
- `scripts/site.mjs`: canonical identity, verified external profiles, per-page metadata and JSON-LD. Add metadata for each new article here; a missing record fails the build rather than silently publishing incomplete metadata.
- `script.js` and `style.css`: navigation, audio, responsive layout and styling.
- `robots.txt`: authoritative crawler policy. The obsolete files in `assets/` redirect to the root discovery files in production.

The original article filenames and `?page=` section links are supported by generated redirects. Canonical URLs use `https://joseisaudio.com/`, `/bio/`, `/projects/`, `/blog/`, `/contact/`, and descriptive project/article subdirectories.

All important content is in the initial HTML. JavaScript enhances the same content with the existing section switches and project modals. It updates URLs, history, headings and metadata. Root-relative resource links keep audio/images working from nested routes.

## Dates

Keep existing publication dates factual. A full date in an article's `<time datetime="YYYY-MM-DD">` is used as `datePublished`. Month-only dates remain month-only and do not invent a publication day. `dateModified` and sitemap `lastmod` are omitted unless reliable content modification dates are introduced. Builds do not stamp the current date onto content.

## IndexNow after deployment

1. Generate your own verification key (8–128 letters, digits or hyphens) and set `INDEXNOW_KEY` in Netlify's build environment. Keep the same value available to your post-deployment command. `.env.example` documents the variable; environment files are not automatically loaded.
2. Build and deploy. The build writes the required public `/<key>.txt` verification file. No Search Console or Bing verification token is fabricated.
3. After the production deployment succeeds, preview the URL list with `npm run indexnow`, then notify participating engines with `npm run indexnow -- --submit`.
4. For incremental updates or removals, create a JSON array of changed canonical URLs and run `npm run indexnow -- --changed changed-urls.json --submit`. Removed URLs may be included even though they are no longer in the sitemap.

Submission verifies that the deployed key file matches before contacting IndexNow. An accepted response means the URLs were received, not that they were indexed. No notification runs during the build, because the new pages/key may not be deployed yet. This command can be connected to a successful production-deployment job once that infrastructure is configured.

See [the SEO audit and implementation report](docs/SEO-REPORT.md) for validation, infrastructure limits and manual search-engine setup.
