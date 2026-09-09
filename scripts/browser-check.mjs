import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { root, origin, games } from './site.mjs';
import { startServer } from './serve.mjs';
import { launchBrowser } from './browser.mjs';

const baseline = process.argv.includes('--baseline');
const { server, url } = await startServer(baseline ? root : path.join(root, 'dist'));
const browser = await launchBrowser();
const { command, evaluate, waitFor } = browser;
const directory = path.join(root, '.artifacts', baseline ? 'before' : 'after');
mkdirSync(directory, { recursive: true });
try {
    for (const width of [1440, 390]) {
        await command('Emulation.setDeviceMetricsOverride', { width, height: width === 1440 ? 900 : 844, deviceScaleFactor: 1, mobile: width === 390 });
        for (const section of ['hero', 'bio', 'portfolio', 'blog', 'contact']) {
            const target = baseline ? '/?page=' + section : ({ hero: '/', bio: '/bio/', portfolio: '/projects/', blog: '/blog/', contact: '/contact/' }[section]);
            await command('Page.navigate', { url: url + target });
            await waitFor(`document.readyState === 'complete' && document.querySelector('.content-page.active')?.id === ${JSON.stringify(section)} && document.querySelectorAll('.work-card').length === 15`);
            await evaluate('document.fonts.ready');
            await new Promise(resolve => setTimeout(resolve, 400));
            const positions = await evaluate(`JSON.stringify([...document.querySelectorAll('.content-page.active h1, .content-page.active h2, .hero-logo, .nav-menu, .profile-img, .work-card, .blog-card')].filter(element => element.getClientRects().length).map(element => { const r = element.getBoundingClientRect(); const c = getComputedStyle(element); return { text: element.textContent.trim().slice(0,60), className: element.className, x:r.x,y:r.y,width:r.width,height:r.height,fontSize:c.fontSize,fontWeight:c.fontWeight,color:c.color }; }))`);
            writeFileSync(path.join(directory, `${width}-${section}.json`), positions);
            const previousFile = path.join(root, '.artifacts/before', `${width}-${section}.json`);
            if (!baseline && existsSync(previousFile)) {
                const previous = JSON.parse(readFileSync(previousFile, 'utf8'));
                const current = JSON.parse(positions);
                for (const element of previous) {
                    const text = element.text.replace('Jimmy Garc�a', 'Jimmy García');
                    const match = current.find(item => item.className === element.className && item.text === text);
                    assert.ok(match, `${width}/${section}: missing ${element.className}`);
                    for (const property of ['x', 'y', 'width', 'height', 'fontSize', 'fontWeight', 'color']) assert.equal(match[property], element[property], `${width}/${section}: ${element.className} ${property}`);
                }
            }
            const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
            writeFileSync(path.join(directory, `${width}-${section}.png`), Buffer.from(shot.data, 'base64'));
        }
    }
    console.log(`Captured 10 ${baseline ? 'baseline' : 'production'} views in ${directory}`);
    if (!baseline) {
        console.log('PASS: original element geometry, typography and colors at desktop and mobile widths');
        const manifest = JSON.parse(readFileSync(path.join(root, 'dist/routes.json'), 'utf8'));
        await command('Emulation.setScriptExecutionDisabled', { value: true });
        for (const page of manifest.pages) {
            await command('Page.navigate', { url: url + page.path });
            await waitFor(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(page.path)}`);
            assert.equal(await evaluate('typeof SITE_DATA'), 'undefined');
            assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1);
            assert.equal(await evaluate('document.querySelector("link[rel=canonical]").href'), origin + page.path);
            const visible = await evaluate('(() => { const heading = document.querySelector("h1"); return heading.getClientRects().length > 0 && getComputedStyle(heading).visibility !== "hidden"; })()');
            assert.equal(visible, true, 'Visible H1 without JavaScript: ' + page.path);
            const project = games.find(game => game.path === page.path);
            if (project) {
                assert.equal(await evaluate('document.querySelector("#game-description").textContent'), project.description);
                assert.equal(await evaluate('getComputedStyle(document.querySelector("#game-overlay")).opacity'), '1');
                assert.equal(await evaluate('document.querySelector("[data-action=close-modal]").getAttribute("href")'), '/projects/');
            }
        }
        await command('Emulation.setScriptExecutionDisabled', { value: false });
        console.log('PASS: all 25 canonical pages expose visible primary content and navigation with JavaScript disabled');
        const go = async target => {
            await command('Page.navigate', { url: url + target });
            await waitFor(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(target)} && typeof SITE_DATA !== 'undefined'`);
        };
        const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
        const expectRoute = async target => {
            await waitFor(`location.pathname === ${JSON.stringify(target)} && document.querySelector('link[rel=canonical]').href === ${JSON.stringify(origin + target)}`);
            assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1);
            assert.equal(await evaluate('document.title'), manifest.pages.find(page => page.path === target).title);
        };
        await go('/');
        await evaluate('window.sameDocument = true');
        await click('.nav-menu [data-page="bio"]'); await expectRoute('/bio/');
        await click('#mobileNavMenu [data-page="portfolio"]'); await expectRoute('/projects/');
        await click('.work-card'); await expectRoute(games[0].path);
        assert.equal(await evaluate('state.modalOpen'), true);
        await click('[data-action="close-modal"]'); await expectRoute('/projects/');
        assert.equal(await evaluate('state.modalOpen'), false);
        await evaluate('history.forward()'); await expectRoute(games[0].path);
        await evaluate('history.back()'); await expectRoute('/projects/');
        assert.equal(await evaluate('window.sameDocument'), true);
        await go(games[1].path);
        await waitFor('state.modalOpen');
        await click('[data-action="close-modal"]'); await expectRoute('/projects/');
        await go('/');
        await click('.sticker[data-game-id]'); await expectRoute(games[0].path);
        assert.equal(await evaluate('document.querySelector(".content-page.active").id'), 'hero');
        await click('[data-action="close-modal"]'); await expectRoute('/');
        await click('.nav-menu [data-page="bio"]'); await expectRoute('/bio/');
        await click('.bio-text-box [data-game-id]'); await expectRoute(games.find(game => game.id === 'NEKOME').path);
        await click('[data-action="close-modal"]'); await expectRoute('/bio/');
        await click('.hamburger-menu');
        assert.equal(await evaluate('state.menuOpen'), true);
        await click('#mobileNavMenu [data-page="blog"]'); await expectRoute('/blog/');
        assert.equal(await evaluate('state.menuOpen'), false);
        await click('.blog-link');
        await waitFor('document.querySelector(".post-container") && document.readyState === "complete"');
        await click('.post-container .back-btn'); await expectRoute('/blog/');
        await waitFor('AudioManager.startLoadingAssets()');
        assert.equal(await evaluate('AudioManager.isMuted'), false);
        assert.ok(await evaluate('AudioManager.play("BUTTON_CLICK")') > 0);
        await click('.mute-btn'); assert.equal(await evaluate('AudioManager.isMuted'), true);
        assert.equal(await evaluate('AudioManager.play("BUTTON_CLICK")'), 0);
        await click('.mute-btn'); assert.equal(await evaluate('AudioManager.isMuted'), false);
        assert.equal(await evaluate(`new DOMParser().parseFromString(${JSON.stringify(readFileSync(path.join(root, 'dist/sitemap.xml'), 'utf8'))}, 'application/xml').querySelector('parsererror') === null`), true);
        assert.deepEqual(browser.errors, []);
        console.log('PASS: sections, project URLs, modals, Back/Forward, direct links, blog return, mobile menu, audio and XML parsing');
    }
} finally {
    await browser.close(); server.closeAllConnections(); server.close();
}
