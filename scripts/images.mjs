import { readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './site.mjs';

const cache = new Map();
export function dimensions(file) {
    if (cache.has(file)) return cache.get(file);
    const buffer = readFileSync(path.join(root, file));
    let width, height;
    if (file.endsWith('.png')) { width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20); }
    else if (file.endsWith('.gif')) { width = buffer.readUInt16LE(6); height = buffer.readUInt16LE(8); }
    else if (file.endsWith('.svg')) {
        const tag = buffer.toString('utf8').match(/<svg\b[^>]*>/)?.[0] || '';
        width = Number(tag.match(/\bwidth="([\d.]+)"/)?.[1]); height = Number(tag.match(/\bheight="([\d.]+)"/)?.[1]);
        if (!width || !height) { const box = tag.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number); if (box) [, , width, height] = box; }
    } else if (file.endsWith('.avif')) {
        const box = buffer.indexOf('ispe');
        if (box >= 0) { width = buffer.readUInt32BE(box + 8); height = buffer.readUInt32BE(box + 12); }
    } else if (file.endsWith('.webp')) {
        const type = buffer.toString('ascii', 12, 16);
        if (type === 'VP8X') { width = buffer.readUIntLE(24, 3) + 1; height = buffer.readUIntLE(27, 3) + 1; }
        else if (type === 'VP8 ') { const signature = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a])); width = buffer.readUInt16LE(signature + 3) & 0x3fff; height = buffer.readUInt16LE(signature + 5) & 0x3fff; }
        else if (type === 'VP8L') { const bits = buffer.readUInt32LE(21); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; }
    }
    if (!width || !height) throw new Error(`Cannot determine image dimensions: ${file}`);
    const result = { width, height }; cache.set(file, result); return result;
}

export function optimizeImageMarkup(html) {
    return html.replace(/<img\b[^>]*>/g, tag => {
        const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
        if (!src || !src.startsWith('/assets/')) return tag;
        const size = dimensions(src.slice(1));
        if (!/\bwidth=/.test(tag)) tag = tag.replace(/>$/, ` width="${size.width}" height="${size.height}">`);
        if (!/\bloading=/.test(tag) && !/hero-logo|mini-logo|volume|footer/.test(tag)) tag = tag.replace(/>$/, ' loading="lazy">');
        if (!/\bdecoding=/.test(tag)) tag = tag.replace(/>$/, ' decoding="async">');
        return tag;
    });
}
