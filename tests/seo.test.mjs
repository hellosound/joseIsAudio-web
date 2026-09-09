import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { root, origin, games, posts, sections, person } from '../scripts/site.mjs';
import { startServer } from '../scripts/serve.mjs';
import { payloadFor } from '../scripts/indexnow.mjs';

const output = path.join(root, 'dist');
const manifest = JSON.parse(readFileSync(path.join(output, 'routes.json'), 'utf8'));
const read = file => readFileSync(path.join(output, file), 'utf8');
const fileFor = urlPath => urlPath === '/' ? 'index.html' : urlPath.slice(1) + 'index.html';
const tags = (html, pattern) => [...html.matchAll(pattern)];

test('every production page has unique metadata, a canonical URL and one real H1', () => {
    assert.equal(manifest.pages.length, Object.keys(sections).length + games.length + posts.length);
    const titles = new Set(), descriptions = new Set();
    for (const page of manifest.pages) {
        const html = read(fileFor(page.path));
        assert.match(html, /<html lang="en">/);
        assert.match(html, /<meta charset="UTF-8">/);
        assert.equal(tags(html, /<title>/g).length, 1, page.path);
        assert.equal(tags(html, /<link rel="canonical"/g).length, 1, page.path);
        assert.ok(html.includes(`rel="canonical" href="${origin}${page.path}"`), page.path);
        assert.equal(tags(html, /<meta name="description"/g).length, 1, page.path);
        assert.equal(tags(html, /<h1\b/g).length, 1, page.path);
        assert.doesNotMatch(html, /(?:noindex|nofollow|nosnippet|noarchive)/, page.path);
        assert.doesNotMatch(html, /\uFFFD|tuweb\.com/, page.path);
        assert.ok(!titles.has(page.title), page.title); titles.add(page.title);
        assert.ok(!descriptions.has(page.description), page.description); descriptions.add(page.description);
        for (const property of ['og:title', 'og:description', 'og:url', 'og:image', 'og:site_name']) assert.ok(html.includes(`property="${property}"`), `${page.path}: ${property}`);
        assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    }
});

test('JSON-LD describes one verified person and connects actual page content', () => {
    for (const page of manifest.pages) {
        const html = read(fileFor(page.path));
        const graphs = tags(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
        assert.equal(graphs.length, 1);
        const schema = JSON.parse(graphs[0][1]);
        assert.equal(schema['@context'], 'https://schema.org');
        const people = schema['@graph'].filter(node => node['@type'] === 'Person');
        assert.deepEqual(people, [person]);
        const webpage = schema['@graph'].find(node => node['@id'] === origin + page.path + '#webpage');
        assert.equal(webpage.about['@id'], origin + '/#person');
        assert.equal(webpage.isPartOf['@id'], origin + '/#website');
        const article = schema['@graph'].find(node => node['@type'] === 'BlogPosting');
        if (article) { assert.equal(article.author['@id'], person['@id']); assert.equal(article.datePublished, posts.find(post => post.path === page.path).datePublished, 'Use only the date actually provided in the source'); }
    }
    assert.ok(person.sameAs.includes('https://schedule.gdconf.com/speaker/angulo-jose/80840'));
});

test('all projects and published articles have their actual primary text in server HTML', () => {
    for (const game of games) {
        const html = read(fileFor(game.path));
        assert.match(html, /id="game-overlay" class="active"/);
        const description = html.match(/<p id="game-description">([\s\S]*?)<\/p>/)?.[1];
        assert.ok(description && description.length > 80, game.id);
        assert.ok(html.includes(game.role.replaceAll('&', '&amp;')), game.id);
    }
    for (const post of posts) {
        const html = read(fileFor(post.path));
        assert.ok(html.includes('class="post-container"'));
        assert.ok(html.includes(`datetime="${post.datePublished || post.publishedMonth}"`));
    }
    assert.equal(tags(read('projects/index.html'), /class="work-card"/g).length, games.length);
    assert.equal(tags(read('blog/index.html'), /class="blog-link"/g).length, posts.length);
    assert.equal(existsSync(path.join(output, 'blog/test-post-1.html')), false);
});

test('every local HTML asset and crawlable link resolves with exact filename case', () => {
    const pagePaths = new Set(manifest.pages.map(page => page.path));
    const fileExistsWithCase = file => {
        let directory = output;
        for (const part of file.split('/').filter(Boolean)) {
            if (!readdirSync(directory).includes(part)) return false;
            directory = path.join(directory, part);
        }
        return existsSync(directory);
    };
    for (const page of manifest.pages) {
        const html = read(fileFor(page.path));
        for (const [, attribute, target] of tags(html, /\b(href|src)="([^"\s]+)"/g)) {
            const url = new URL(target.replaceAll('&amp;', '&'), origin + page.path);
            if (url.origin !== origin) continue;
            if (url.pathname.endsWith('/')) assert.ok(pagePaths.has(url.pathname), `${page.path}: ${target}`);
            else assert.ok(fileExistsWithCase(decodeURIComponent(url.pathname)), `${page.path}: ${attribute}=${target}`);
        }
        for (const [image] of tags(html, /<img\b[^>]*>/g)) {
            assert.match(image, /\balt="[^"]*"/, page.path);
            assert.match(image, /\bwidth="[\d.]+"/, image);
            assert.match(image, /\bheight="[\d.]+"/, image);
        }
    }
    const hero = read('index.html').match(/<img[^>]*class="hero-logo"[^>]*>/)[0];
    assert.doesNotMatch(hero, /loading="lazy"/);
    assert.match(hero, /fetchpriority="high"/);
});

test('robots allows discovery; sitemap contains only canonical indexable pages', () => {
    const robots = read('robots.txt');
    assert.match(robots, /User-agent: \*\nAllow: \//);
    assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
    assert.doesNotMatch(robots, /Disallow: \/\s*$/m);
    assert.doesNotMatch(robots, /User-agent: GPTBot/);
    const xml = read('sitemap.xml');
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    const locations = tags(xml, /<loc>([^<]+)<\/loc>/g).map(match => match[1]);
    assert.deepEqual(locations.sort(), manifest.pages.map(page => origin + page.path).sort());
    assert.equal(new Set(locations).size, locations.length);
    assert.doesNotMatch(locations.join('\n'), /test-post|\.html|\?/);
    assert.doesNotMatch(xml, /<lastmod>|priority|changefreq/);
});

test('local production server serves indexable HTML and resolves legacy redirects without loops', async () => {
    const { server, url } = await startServer();
    try {
        for (const page of manifest.pages) {
            const response = await fetch(url + page.path);
            assert.equal(response.status, 200, page.path);
            assert.ok((await response.text()).includes(`href="${origin}${page.path}"`));
        }
        for (const rule of manifest.redirects) {
            const from = rule.from + (rule.query ? '?' + new URLSearchParams(rule.query) : '');
            const response = await fetch(url + from, { redirect: 'manual' });
            assert.equal(response.status, 301, from);
            const target = new URL(response.headers.get('location'), url);
            const final = await fetch(target);
            assert.equal(final.status, 200, `${from} -> ${target}`);
        }
        assert.equal((await fetch(url + '/robots.txt')).status, 200);
        assert.equal((await fetch(url + '/sitemap.xml')).status, 200);
        assert.equal((await fetch(url + '/missing-project/')).status, 404);
        assert.equal((await fetch(url + '/blog/test-post-1.html')).status, 404);
    } finally { server.closeAllConnections(); server.close(); }
});

test('IndexNow accepts changed and removed canonical URLs and rejects other hosts or tokens', () => {
    const key = 'test-verification-key';
    const payload = payloadFor([origin + '/', origin + '/removed-project/'], key);
    assert.equal(payload.keyLocation, origin + '/' + key + '.txt');
    assert.throws(() => payloadFor(['https://example.com/'], key));
    assert.throws(() => payloadFor([origin + '/?page=bio'], key));
    assert.throws(() => payloadFor([origin + '/'], ''));
});
