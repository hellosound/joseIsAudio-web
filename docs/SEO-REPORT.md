# Technical SEO audit and implementation — joseisaudio

Audit date: 2026-09-09. Scope: repository and read-only public HTTP checks of `https://joseisaudio.com`. Changes are prepared locally; production deployment and search-engine indexing have not been claimed.

## 1. SEO Audit

The site used handwritten HTML, CSS and vanilla JavaScript. The homepage behaved as a small SPA: sections were hidden/shown and `?page=` links populated the browser history. Five published blog posts had separate HTML files. Fifteen projects and the blog listing were populated from JSON after JavaScript executed; project details existed only in a modal. There was no framework, package manifest, build, lint, typecheck or test command to preserve.

| Area | Finding before implementation |
| --- | --- |
| Hosting | Public response headers identify Netlify. HTTPS and `www` → apex already return 301 redirects. |
| Discovery files | `/robots.txt` and `/sitemap.xml` returned **404**. Both files were incorrectly stored under `/assets/`; the old sitemap also omitted a published article and the section/project pages. |
| Metadata | Homepage lacked a regular description and canonical. Most articles lacked canonicals. Article social metadata contained wrong paths, inconsistent titles and a nonexistent Mario thumbnail location. |
| Entity | A basic Person object existed, but no stable Person/WebSite/WebPage graph or connection from article/project metadata. |
| Rendering | Projects and article-list links depended on JSON fetches and DOM construction. Search systems without JavaScript could not discover or read individual project details. |
| URLs | `/index.html` duplicated `/`. Netlify redirected legacy mixed-case article `.html` URLs to lower-case extensionless paths, while metadata used other variants. |
| Headings/language | Homepage had no H1. Main HTML said Spanish although its content was English. Several articles skipped from H1 to H3. |
| Encoding | The portrait's source `alt` literally contained U+FFFD: `Jos� Angulo`. This was not an HTTP charset problem: the server already declared UTF-8. `games.json` and CSS also contained damaged characters. |
| Images/performance | Most image dimensions were missing. Hero stickers were lazy-loaded and created after data fetching. Existing AVIF/WebP formats and `font-display=swap` were useful foundations. A 1.60 MB background SVG and 3.53 MB article GIF remain the main large assets. |
| Example content | `blog/test-post-1.html` contained placeholder content and `tuweb.com` metadata despite being absent from the published list. |
| Verification/security | No Search Console/Bing token, auth middleware, WAF configuration or restrictive indexing headers was found. No verification credentials were invented. |

Live HEAD requests returned 200 for the homepage using the names Googlebot, Bingbot, OAI-SearchBot and PerplexityBot. These probes do not impersonate verified crawler IPs and cannot prove that every CDN/WAF rule allows real crawlers. No blanket infrastructure-blocking claim is made.

## 2. Changes Implemented

- Added a small, dependency-free Node build. It creates **25 canonical pages**: five sections, fifteen projects and five articles. Netlify publishes the generated `dist/` directory.
- Each route receives actual primary HTML, a unique title/description, an absolute canonical, social metadata, structured data and one visible H1. JavaScript is an enhancement rather than the only source of project/list content.
- Section URLs are `/bio/`, `/projects/`, `/blog/` and `/contact/`. Projects and articles have stable descriptive subdirectory URLs. Legacy `?page=` and article `.html` links receive generated permanent redirects. Netlify handles directory slash normalization; there is no catch-all SPA rewrite turning missing pages into HTTP 200.
- Kept the project modal presentation. Opening a project updates its URL and metadata; a direct project URL renders the same modal content in the original interface. Back/Forward and close controls remain usable. BACK controls have ordinary links as a JavaScript-free fallback.
- Added contextual links using existing biography project names and the existing La Casa de Papel reference in the remixing article. Author names in the existing footer link to the canonical identity page. Link styling preserves the current appearance.
- Corrected Jose Angulo's portrait alt text, the damaged García spelling and the CSS bullet character. Output remains UTF-8.
- Added intrinsic image dimensions, lazy loading for noncritical article/portfolio media and iframe titles. The visible home logo has high fetch priority; home stickers are eager and statically present; the biography portrait is eager on its own page.
- Removed the runtime games/posts JSON requests on generated pages and avoided rebuilding existing sticker DOM. Removed duplicate font stylesheets and added missing font preconnections in article output.
- Added Netlify cache headers for assets, MIME protection, a referrer policy and a proper 404 document. Existing HTTPS/HSTS behavior is retained.
- Added root `robots.txt`, generated `sitemap.xml`, optional factual `llms.txt`, and repository-side IndexNow support. The unpublished example is excluded from production and the sitemap.

## 3. Entity SEO

The graph connects these stable IDs:

| ID | Role |
| --- | --- |
| `https://joseisaudio.com/#person` | Jose Angulo, with alternate names `joseisaudio` and `Jose Angulo Audio` |
| `https://joseisaudio.com/#website` | The professional portfolio, published by that person |
| `https://joseisaudio.com/#webpage` | The canonical homepage/ProfilePage, whose main entity is that person |
| Each canonical URL + `#webpage` | A specific section, project or article page connected to the site and person |

The Person job title is **Technical Sound Designer and Game Audio Programmer**. Description, technologies and topics come from the visible biography, project credits and articles. The Future Class 2023 recognition appears in the biography and is also corroborated by the [GDC speaker profile](https://schedule.gdconf.com/speaker/angulo-jose/80840).

`sameAs` uses the portfolio's LinkedIn, GitHub and YouTube profiles plus that verified GDC speaker URL. The general GACO event page is kept as a talk link, rather than incorrectly declaring an entire conference page to be the Person entity. No unverified employer, credential, review or testimonial was added.

BlogPosting authors and publishers reference `#person`. Project entries describe Jose's actual credited work; they do not claim that he authored the entire video game. Project collection and blog collection use ItemList relationships to their actual pages.

The homepage H1 uses the existing visible logo and an accurate image alternative identifying Jose Angulo/joseisaudio. A new visible prose headline was deliberately not added. The existing subtitle, biography, footer and metadata supply the professional context without a hidden SEO heading or keyword block.

## 4. AI Search

Google AI Overviews/AI Mode benefit from indexable, retrievable text, ordinary internal links, canonical consistency and factual schema. Google documents that [no additional technical requirements or special AI markup are needed](https://developers.google.com/search/docs/appearance/ai-features).

The wildcard robots policy permits Googlebot, Bingbot, OAI-SearchBot and PerplexityBot while retaining the previous draft/temp exclusions. OpenAI documents that [OAI-SearchBot controls search discovery independently of GPTBot](https://developers.openai.com/api/docs/bots). No separate model-training preference was changed. Perplexity likewise documents [PerplexityBot as a discovery crawler](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).

Bing/Copilot can discover the same static pages through links and the sitemap; IndexNow support can notify participating engines after deployment. `llms.txt` is only a factual supplementary index, not a ranking mechanism or a replacement for ordinary SEO. It contains no instructions to manipulate a model.

Technical eligibility does not guarantee ranking, indexing, AI citation or knowledge-graph inclusion.

## 5. Technical Files

| File | Purpose |
| --- | --- |
| `scripts/site.mjs` | Canonical identity, evidence-based schema, route definitions and metadata |
| `scripts/build.mjs` | Production HTML, crawler files, redirects and headers |
| `scripts/images.mjs` | Intrinsic image dimensions and loading attributes |
| `script.js` | Enhanced section/project routes, browser history, metadata updates, audio |
| `index.html`, `games.json`, `style.css` | Encoding fixes, stable project slugs, unchanged-style semantic support |
| `robots.txt` | Authoritative crawl policy; obsolete copies under `assets/` removed |
| `netlify.toml`, `package.json` | Build/publish configuration and repeatable commands |
| `scripts/indexnow.mjs`, `.env.example` | Post-deploy ownership verification and notification support |
| `tests/seo.test.mjs` | Production metadata, entity, content, link, HTTP and sitemap checks |
| `scripts/browser*.mjs`, `scripts/serve.mjs` | Real-browser/no-JavaScript checks, preview and visual comparison |

Generated output includes `/sitemap.xml`, `/llms.txt`, `/_redirects`, `/_headers`, `/404.html`, the route manifest and all canonical pages. Build artifacts are ignored by Git.

## 6. Validation

- Production build succeeds: **25 pages**.
- Syntax checks pass. No existing lint/typecheck command was removed; the project has no TypeScript and no third-party lint dependency was added.
- Seven automated Node test groups pass, covering unique metadata/H1s, JSON-LD validity, Person references, static primary content, exact-case internal links/assets, image attributes, sitemap membership, local HTTP responses/redirects and IndexNow payload validation.
- The sitemap parses as XML and contains exactly 25 canonical, indexable URLs. It excludes legacy redirects, the example post, system files and the 404 page.
- Chrome checks all 25 routes with JavaScript disabled: primary content and headings remain visible. Project descriptions and close-link fallbacks exist in the server HTML.
- Browser scenarios cover section changes, project URLs, direct project visits, original modal backgrounds, close controls, browser Back/Forward, biography project links, blog return, mobile menus and audio/mute.
- Ten desktop/mobile reference views verify original element positions, dimensions, font sizes, weights and colors. Screenshots are available locally in `.artifacts/`; this is not a claim that every screenshot byte or scrollbar timing is identical.
- No accidental `noindex`, `nofollow`, `nosnippet`, `noarchive`, placeholder hostname or damaged replacement character remains in canonical HTML. The 404 intentionally has `noindex`; it is not a public content page.
- IndexNow was validated in dry-run mode. No real notification or form submission was sent.

The latest architecture article already has a source `<time datetime="2026-09-07">`, which is used as its publication date. Four older posts only establish a month; their BlogPosting data omits an invented day. No new `dateModified` or sitemap `lastmod` is manufactured from build time.

Limits: this validates the local production output and the documented Netlify configuration, not an already deployed change. Search Console/Bing reports, real-user Core Web Vitals and verified-crawler IP access require production/account access. Browser visual tests use blocked external network requests for repeatability; they are not field LCP/INP measurements. Existing artwork and animation files were retained.

## 7. Visible Changes

No redesign, new homepage copy, new artwork, color change or deliberate typography/spacing/animation change was introduced. Existing heading text and portfolio presentation remain.

Visitor-visible behavior does improve: readable URLs, directly shareable projects, usable JavaScript-free pages, ordinary link semantics and a themed missing-page fallback. Existing text has a corrected surname character and a corrected list bullet. The portrait's alternative text is corrected for assistive technology. These are the intentionally limited visible/accessibility changes.

## 8. Manual Actions Required

1. **Deploy the generated site.** Netlify's repository configuration sets the command and `dist/` publish directory. Verify the resulting deployment uses this configuration, then check root robots/sitemap and representative legacy redirects in production. Review any account-level bot protection separately; do not disable legitimate security controls.
2. **Google Search Console:** add the Domain property `joseisaudio.com`; copy Google's actual DNS TXT verification record into the authoritative DNS provider. After verification and deployment, submit `https://joseisaudio.com/sitemap.xml` and inspect the homepage, biography, one project and one article. No verification token exists in this repository.
3. **Bing Webmaster Tools:** import the verified property from Search Console, or use Bing's actual verification instructions. Submit the same sitemap. No Bing token was fabricated.
4. **IndexNow:** set your own `INDEXNOW_KEY`, deploy the generated root key file, then run the documented post-deploy submission. The CLI supports a changed-URL list including removals. Connecting the command to a successful deployment event requires the owner's deployment configuration. Follow the [IndexNow ownership and submission protocol](https://www.indexnow.org/documentation).
5. **OFF-SITE SEO:** ensure the LinkedIn, GitHub and YouTube profiles point to `https://joseisaudio.com/` and use consistent professional wording. Ask GDC/GACO or other relevant conference organizers to link the portfolio from the actual speaker profile where possible. Prefer these relevant professional references over generic directories. No external profile was edited.

## 9. Further Opportunities

- **HIGH:** after deployment, inspect crawl/index coverage and canonical selection for the migrated article paths. Existing external links may still reference old URLs; retain redirects and update owned profile links to canonical targets.
- **HIGH:** obtain relevant profile/talk links that corroborate Jose's technical audio work, especially the already verified GDC speaker identity. These support entity disambiguation among people sharing the name.
- **MEDIUM:** publish additional approved project case-study detail on the existing project URLs: concrete implementation decisions, debugging examples, role boundaries and playable/video evidence where disclosure is permitted. This can attract qualified technical searches more effectively than repeating job-title keywords.
- **MEDIUM:** measure production LCP/INP/CLS after sufficient traffic. The background SVG and animated article GIF are concrete next candidates for carefully verified lossless/media optimization; do not remove animation or alter the artwork merely to improve a score.
- **LOW:** supply exact publication/modification dates for the four month-only articles if reliable records exist. Add them to source rather than estimating dates for rich-result eligibility.
