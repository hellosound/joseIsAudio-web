import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { root, origin, read, escapeHtml as esc, json, sections, posts, games, metadata, graphFor } from './site.mjs';
import { optimizeImageMarkup } from './images.mjs';

const output = path.resolve(root, 'dist');
// The only recursive cleanup target is this repository's generated output.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') throw new Error('Unsafe output directory');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
function write(file, content) { const target = path.join(output, file); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, content); }
for (const directory of ['assets', 'downloads']) cpSync(path.join(root, directory), path.join(output, directory), { recursive: true, filter: file => !/assets[\\/](robots\.txt|sitemap\.xml)$/.test(file) });
for (const file of ['script.js', 'style.css', 'games.json', 'posts.json', 'robots.txt']) write(file, read(file));

function rootLinks(html) {
    return html.replace(/(<p class="footer-credits">[\s\S]*?)Jose Angulo/, '$1<a class="context-link" href="/" rel="author">Jose Angulo</a>').replace(/\b(src|href|poster)="([^"#]+)"/g, (tag, attribute, value) => {
        const clean = value.replace(/\\/g, '/');
        if (/^(?:https?:|mailto:|tel:|data:|\/)/.test(clean)) return `${attribute}="${clean}"`;
        const section = clean.match(/^(?:\.\.\/)?(?:index\.html)?\?page=(\w+)$/)?.[1];
        if (section) return `${attribute}="${sections[section]?.path || '/bio/'}"`;
        const local = clean.replace(/^(?:\.\.\/)+/, '');
        const post = posts.find(post => post.source === local || path.basename(post.source) === local);
        return `${attribute}="${post?.path || '/' + local}"`;
    });
}

function prepareHead(html, page) {
    return html.replace(/<head>([\s\S]*?)<\/head>/, (_, head) => {
        head = head.replace(/<title>[\s\S]*?<\/title>/g, '')
            .replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="(?:og:[^"]+|article:[^"]+)")[^>]*>/g, '')
            .replace(/<link\b[^>]*rel="canonical"[^>]*>/g, '')
            .replace(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, '');
        const seen = new Set();
        head = head.replace(/<link\b[^>]*>/g, tag => { if (seen.has(tag)) return ''; seen.add(tag); return tag; });
        if (!head.includes('rel="icon"')) head += '\n<link rel="icon" href="/assets/img/web/img-favicon.png" type="image/png">';
        if (!head.includes('rel="preconnect"')) head += '\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
        return `<head>${head.trimEnd()}\n    ${metadata(page)}\n</head>`;
    });
}

function card(game) {
    return `<a href="${game.path}" class="work-card" data-game-id="${esc(game.id)}" data-sound="BUTTON_CLICK" aria-label="View ${esc(game.title)}: ${esc(game.role)}"><img src="/${game.image}" alt="${esc(game.title)}" class="work-image" loading="lazy"><div class="work-info-overlay"><h3>${esc(game.title)}</h3><p>${esc(game.studio)}</p></div></a>`;
}
function sticker(game, index) {
    const colors = { TMNT: '#f1b83a', 'KILLER KLOWNS': '#00b4eb', 'AL-UMBRA': '#00b4eb' };
    return `<a href="${game.path}" class="sticker game-${index + 1}" data-game-id="${esc(game.id)}" data-sound="${esc(game.id)}" aria-label="Open project: ${esc(game.title)}" style="width:var(--sticker-size,${game.stickerWidth || '140px'});height:var(--sticker-size,${game.stickerHeight || '140px'});left:var(--sticker-x,${game.stickerLeft || '50%'});top:var(--sticker-y,${game.stickerTop || '50%'});transform:var(--sticker-transform,rotate(${game.stickerRotate || 0}deg));--sticker-left-mobile:${game.stickerLeftMobile};--sticker-top-mobile:${game.stickerTopMobile}"><img src="/${game.stickerImage || game.image}" alt="" class="sticker-thumb" loading="eager"><span class="sticker-label" style="color:${colors[game.id] || '#ffffff'}">${esc(game.id)}</span></a>`;
}
const pages = Object.entries(sections).map(([section, page]) => ({ ...page, section }));
for (const game of games) pages.push({ path: game.path, title: `${game.title} | Jose Angulo`, description: `${game.title}: ${game.role.toLowerCase()} by Jose Angulo. ${game.description}`, section: 'portfolio', game });
// Keep project descriptions useful as snippets without truncating a word.
for (const page of pages.filter(page => page.game)) {
    const short = `${page.game.title}: ${page.game.role.toLowerCase()} by Jose Angulo.${page.game.tech !== 'TBA' ? ' ' + page.game.tech + '.' : ''}`;
    page.description = short;
}
const shared = graphFor(pages[0])['@graph'].filter(node => /#(?:website|person)$/.test(node['@id']));
const routes = Object.fromEntries(pages.map(page => [page.path, { title: page.title, description: page.description, section: page.section, gameId: page.game?.id, schema: graphFor(page)['@graph'].filter(node => !shared.some(sharedNode => sharedNode['@id'] === node['@id'])) }]));
let template = rootLinks(read('index.html')).replace('<html lang="es">', '<html lang="en">');
template = template.replace('alt="Jos� Angulo"', 'alt="Jose Angulo, Technical Sound Designer and Game Audio Programmer"');
template = template.replace(/<section id="talks"[\s\S]*?<\/section>/, '');
template = template.replace(/<img([^>]*class="hero-logo"[^>]*)>/, '<h2 class="hero-heading"><img$1></h2>')
    .replace(/alt="joseIsAudio" class="hero-logo"/, 'alt="Jose Angulo (joseisaudio)" class="hero-logo" fetchpriority="high"');
template = template.replace('<div id="dynamic-stickers"></div>', `<div id="dynamic-stickers" data-static>${games.filter(game => game.isSticker).map(sticker).join('\n')}</div>`)
    .replace('<div id="portfolio-grid" class="portfolio-works-grid"></div>', `<div id="portfolio-grid" class="portfolio-works-grid" data-static>${games.map(card).join('\n')}</div>`)
    .replace('<div id="blog-list" class="blog-container"></div>', `<div id="blog-list" class="blog-container" data-static>${posts.map(post => `<article class="blog-card"><a class="blog-link" href="${post.path}" data-sound="BUTTON_CLICK"><time class="blog-date" datetime="${post.publishedMonth}">${esc(post.date)}</time><h3>${esc(post.listingTitle)}</h3><p>${esc(post.listingDescription)}</p></a></article>`).join('\n')}</div>`);
// Correct the heading hierarchy using the existing words and styles.
template = template.replace(/<span class="section-label-line">([^<]+)<\/span>/g, '<h2 class="section-label-line">$1</h2>')
    .replace(/<h4 class="speaking-title">([^<]+)<\/h4>/g, '<h3 class="speaking-title">$1</h3>')
    .replace('<h2 class="section-label-line">SPEAKING</h2>', '<h2 class="section-label-line" id="speaking">SPEAKING</h2>');
template = template.replace('<script src="/script.js"></script>', `<script type="application/json" id="site-data">${json({ games, sections, routes, entities: shared })}</script>\n    <script src="/script.js"></script>`);
template = template.replace(/<button type="button" class="back-btn" data-action="(back|close-modal)"([^>]*)>([^<]+)<\/button>/g, (_, action, attributes, text) => `<a href="${action === 'close-modal' ? '/projects/' : '/'}" class="back-btn" data-action="${action}"${attributes}>${text}</a>`);
for (const [label, id] of [['Nekome', 'NEKOME'], ['Orcs Must Die! By the Blade', 'ORCS MUST DIE'], ['Killer Klowns From Outer Space', 'KILLER KLOWNS']]) {
    const game = games.find(game => game.id === id);
    const biography = template.indexOf('<div class="bio-text-box">');
    const end = template.indexOf('</div>', biography);
    template = template.slice(0, biography) + template.slice(biography, end).replace(label, `<a class="context-link" href="${game.path}" data-game-id="${esc(id)}" data-sound="BUTTON_CLICK">${label}</a>`) + template.slice(end);
}

for (const page of pages) {
    let html = prepareHead(template, page);
    html = html.replace(/<section id="(hero|bio|blog|portfolio|contact)" class="content-page(?: active)?">/g, (_, id) => `<section id="${id}" class="content-page${id === page.section ? ' active' : ''}">`);
    // One real, visible H1. The home logo retains its artwork and exact wording.
    const heading = page.game ? /<h2 id="game-title"([^>]*)>[\s\S]*?<\/h2>/ : page.section === 'hero' ? /<h2 class="hero-heading">([\s\S]*?)<\/h2>/ : new RegExp(`(<section id="${page.section}"[\\s\\S]*?)<h2([^>]*)>([\\s\\S]*?)<\\/h2>`);
    if (page.game) {
        const game = page.game;
        html = html.replace(heading, `<h1 id="game-title"$1>${esc(game.title)}</h1>`)
            .replace('id="game-overlay" role=', 'id="game-overlay" class="active" role=')
            .replace('aria-labelledby="game-title" aria-hidden="true"', 'aria-labelledby="game-title" aria-hidden="false"')
            .replace('<body>', '<body class="no-scroll">');
        for (const [id, value] of Object.entries({ 'game-studio': game.studio, 'game-role': game.role, 'game-description': game.description, 'game-tech': game.tech || 'N/A', 'game-platforms': game.platforms || 'TBA' })) html = html.replace(new RegExp(`(<(?:p|span) id="${id}">)[\\s\\S]*?(</(?:p|span)>)`), `$1${esc(value)}$2`);
        const media = game.video ? `<iframe src="${esc(game.video)}" title="Video of ${esc(game.title)}" loading="lazy" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0"></iframe>` : `<img src="/${game.image}" alt="${esc(game.title)}" class="game-media-image">`;
        html = html.replace('<div id="media-container"></div>', `<div id="media-container">${media}</div>`);
    } else if (page.section === 'hero') html = html.replace(heading, '<h1 class="hero-heading">$1</h1>');
    else html = html.replace(heading, '$1<h1$2>$3</h1>');
    html = optimizeImageMarkup(html);
    if (page.section === 'bio') html = html.replace(/(<img[^>]*class="profile-img"[^>]*) loading="lazy"/, '$1 loading="eager" fetchpriority="high"');
    write(page.path === '/' ? 'index.html' : page.path.slice(1) + 'index.html', html);
}

for (const post of posts) {
    let html = rootLinks(read(post.source));
    const headline = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '');
    const page = { ...post, post, headline, type: 'WebPage' };
    html = prepareHead(html, page);
    html = html.replace(/<span class="post-date">([^<]+)<\/span>/, `<time class="post-date" datetime="${post.publishedMonth}">$1</time>`);
    if (!/<h2\b/.test(html.slice(html.indexOf('<main')))) html = html.replace(/<h3>([\s\S]*?)<\/h3>/g, '<h2 class="former-h3">$1</h2>').replaceAll('.post-content h3', '.post-content :is(h3, .former-h3)');
    if (!/<article\b/.test(html)) html = html.replace(/<\/article>/g, '');
    html = html.replace(/<iframe\b([^>]*)>/g, (_, attributes) => `<iframe${attributes}${/\btitle=/.test(attributes) ? '' : ` title="${esc(headline)} — video"`}${/\bloading=/.test(attributes) ? '' : ' loading="lazy"'}>`);
    html = optimizeImageMarkup(html).replaceAll("url('assets/", "url('/assets/");
    html = html.replace('<em>La Casa de Papel</em>', `<a class="context-link" href="${games.find(game => game.id === 'LCDP').path}"><em>La Casa de Papel</em></a>`);
    write(post.path.slice(1) + 'index.html', html);
    pages.push(page);
}

const redirects = [];
for (const [section, page] of Object.entries(sections)) for (const from of ['/', '/index.html']) redirects.push({ from, query: { page: section }, to: page.path + '?' });
for (const from of ['/', '/index.html']) redirects.push({ from, query: { page: 'talks' }, to: '/bio/?#speaking' });
redirects.push({ from: '/index.html', to: '/' }, { from: '/talks/', to: '/bio/#speaking' }, { from: '/assets/robots.txt', to: '/robots.txt' }, { from: '/assets/sitemap.xml', to: '/sitemap.xml' });
for (const page of pages.filter(page => page.path !== '/')) redirects.push({ from: page.path + 'index.html', to: page.path });
for (const post of posts) for (const old of new Set(['/' + post.source, '/' + post.source.toLowerCase()])) redirects.push({ from: old, to: post.path });
write('_redirects', ['https://www.joseisaudio.com/* https://joseisaudio.com/:splat 301!', 'http://joseisaudio.com/* https://joseisaudio.com/:splat 301!', ...redirects.map(rule => `${rule.from}${rule.query ? ' ' + Object.entries(rule.query).map(([key, value]) => `${key}=${value}`).join(' ') : ''} ${rule.to} 301!`)].join('\n') + '\n');
write('_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/*\n  Cache-Control: public, max-age=86400\n/robots.txt\n  Content-Type: text/plain; charset=utf-8\n/sitemap.xml\n  Content-Type: application/xml; charset=utf-8\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${origin}${esc(page.path)}</loc></url>`).join('\n')}\n</urlset>\n`);
write('llms.txt', `# Jose Angulo — joseisaudio\n\n${sections.hero.description}\n\nCanonical website: ${origin}/\n\n## Portfolio\n${Object.values(sections).map(page => `- [${page.title}](${origin}${page.path}): ${page.description}`).join('\n')}\n\n## Projects\n${games.map(game => `- [${game.title}](${origin}${game.path}): ${game.role}`).join('\n')}\n\n## Articles\n${posts.map(post => `- [${post.listingTitle}](${origin}${post.path}): ${post.description}`).join('\n')}\n`);
write('404.html', '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Jose Angulo</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/style.css"></head><body><main class="content-page active"><h1>Page not found</h1><a class="back-btn" href="/">HOME</a></main></body></html>');
write('routes.json', json({ pages: pages.map(page => ({ path: page.path, title: page.title, description: page.description })), redirects }));
if (process.env.INDEXNOW_KEY) {
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(process.env.INDEXNOW_KEY)) throw new Error('Invalid INDEXNOW_KEY format');
    write(`${process.env.INDEXNOW_KEY}.txt`, process.env.INDEXNOW_KEY);
}
console.log(`Built ${pages.length} canonical HTML pages, robots.txt, sitemap.xml and redirects in dist/`);
