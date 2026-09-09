import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { origin, root } from './site.mjs';

export function payloadFor(urls, key) {
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(key || '')) throw new Error('Set INDEXNOW_KEY to your own 8–128 character verification key.');
    const urlList = [...new Set(urls)];
    if (!urlList.length || urlList.length > 10000) throw new Error('Submit between 1 and 10,000 changed URLs.');
    for (const value of urlList) {
        const url = new URL(value);
        if (url.origin !== origin || url.hash || url.search || url.username || url.password) throw new Error(`Use a canonical URL on ${origin}: ${value}`);
    }
    return { host: new URL(origin).host, key, keyLocation: `${origin}/${key}.txt`, urlList };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const changedArgument = process.argv.indexOf('--changed');
    const urls = changedArgument >= 0
        ? JSON.parse(readFileSync(process.argv[changedArgument + 1], 'utf8'))
        : JSON.parse(readFileSync(path.join(root, 'dist/routes.json'), 'utf8')).pages.map(page => origin + page.path);
    if (!process.argv.includes('--submit')) {
        console.log(JSON.stringify({ mode: 'dry-run; no request sent', urlList: urls }, null, 2));
    } else {
        const payload = payloadFor(urls, process.env.INDEXNOW_KEY);
        const verification = await fetch(payload.keyLocation, { redirect: 'error', signal: AbortSignal.timeout(15000) });
        if (!verification.ok || (await verification.text()).trim() !== payload.key) throw new Error('Deploy the matching root key file before notifying IndexNow.');
        const response = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
        if (![200, 202].includes(response.status)) throw new Error(`IndexNow returned HTTP ${response.status}; no indexing claim can be made.`);
        console.log(`IndexNow received ${payload.urlList.length} URLs (HTTP ${response.status}). Receipt does not guarantee indexing.`);
    }
}
