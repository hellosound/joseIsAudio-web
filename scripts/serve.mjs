import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './site.mjs';

export function startServer(directory = path.join(root, 'dist'), port = 0) {
    const base = path.resolve(directory);
    const redirects = existsSync(path.join(base, 'routes.json')) ? JSON.parse(readFileSync(path.join(base, 'routes.json'), 'utf8')).redirects : [];
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const rule = redirects.find(rule => rule.from === url.pathname && Object.entries(rule.query || {}).every(([key, value]) => url.searchParams.get(key) === value));
        if (rule) { res.writeHead(301, { Location: rule.to }).end(); return; }
        let filename;
        try { filename = path.resolve(base, '.' + decodeURIComponent(url.pathname)); } catch { res.writeHead(400).end(); return; }
        if (filename !== base && !filename.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
        if (existsSync(filename) && statSync(filename).isDirectory()) {
            if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }).end(); return; }
            filename = path.join(filename, 'index.html');
        }
        if (!existsSync(filename)) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(existsSync(path.join(base, '404.html')) ? readFileSync(path.join(base, '404.html')) : 'Not found');
            return;
        }
        const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.opus': 'audio/ogg' };
        res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
        res.end(readFileSync(filename));
    });
    return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` })));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { url } = await startServer(undefined, Number(process.env.PORT || 4173));
    console.log(`Preview: ${url}`);
}
