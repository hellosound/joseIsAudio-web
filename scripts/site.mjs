import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const origin = 'https://joseisaudio.com';
export const read = file => readFileSync(path.join(root, file), 'utf8');
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
export const slugify = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const socialImage = `${origin}/assets/img/web/img-embeed-miniature.png`;
export const identityDescription = 'Jose Angulo (joseisaudio) is a Technical Sound Designer and Game Audio Programmer creating interactive audio with Unreal Engine, C++, FMOD and Wwise.';
export const person = {
    '@type': 'Person', '@id': `${origin}/#person`, name: 'Jose Angulo',
    alternateName: ['joseisaudio', 'Jose Angulo Audio'], url: `${origin}/`,
    image: `${origin}/assets/img/bio/headshot.avif`, description: identityDescription,
    jobTitle: 'Technical Sound Designer and Game Audio Programmer',
    sameAs: [
        'https://www.linkedin.com/in/joseisaudio/',
        'https://github.com/hellosound',
        'https://www.youtube.com/@joseisaudio',
        'https://schedule.gdconf.com/speaker/angulo-jose/80840'
    ],
    knowsAbout: ['Game Audio', 'Technical Sound Design', 'Game Audio Programming', 'Gameplay Audio Systems', 'Interactive Audio', 'Game Audio Implementation', 'C++', 'Unreal Engine', 'FMOD', 'Wwise', 'Unity', 'Audio Debugging', 'Audio Tools Programming'],
    award: 'The Game Awards Future Class 2023',
    mainEntityOfPage: { '@id': `${origin}/#webpage` }
};
export const sections = {
    hero: { path: '/', title: 'Jose Angulo | Game Audio Programmer & Technical Sound Designer', description: identityDescription, type: 'ProfilePage' },
    bio: { path: '/bio/', title: 'About Jose Angulo | Technical Sound Design & Game Audio', description: 'Meet Jose Angulo: game audio programming, technical sound design, Unreal Engine, Unity, FMOD and Wwise, plus talks at GDC and Game Audio Conference Oslo.', type: 'ProfilePage' },
    portfolio: { path: '/projects/', title: 'Game Audio Portfolio | Jose Angulo — joseisaudio', description: 'Explore Jose Angulo’s video game audio work: technical sound design, gameplay audio implementation, interactive systems and original music.', type: 'CollectionPage' },
    blog: { path: '/blog/', title: 'Game Audio Programming & Sound Design Blog | Jose Angulo', description: 'Articles by Jose Angulo on interactive music, Unreal Engine MetaSounds, Unity, Wwise, software architecture and audio programming.', type: 'CollectionPage' },
    contact: { path: '/contact/', title: 'Contact Jose Angulo | Game Audio & Technical Sound Design', description: 'Contact Jose Angulo (joseisaudio) about technical sound design, game audio programming and interactive audio implementation for video games.', type: 'ContactPage' }
};
const articleMetadata = {
    'Super-Mario-Galaxy-Rolling-Ball-Music': { title: 'Super Mario Galaxy Music in Unreal Engine | Jose Angulo', description: 'Jose Angulo recreates Super Mario Galaxy’s rolling ball music with Unreal Engine MetaSounds and Blueprints, connecting physics to interactive music.', publishedMonth: '2026-06' },
    'Ten-years-later': { title: 'Ten Years Later: Building My Audio Portfolio | Jose Angulo', description: 'Jose Angulo reflects on a decade in game audio and the process of building a personal portfolio with interactive sound.', publishedMonth: '2026-07' },
    'Creating-a-website-with-sounds': { title: 'Building a Website with Web Audio API Sounds | Jose Angulo', description: 'Jose Angulo explains his portfolio’s Web Audio API engine: asynchronous sound loading, audio context initialization and interactive button sounds.', publishedMonth: '2026-07' },
    'An-alternative-to-Vertical-Remixing': { title: 'An Alternative to Vertical Remixing | Jose Angulo', description: 'Jose Angulo describes an interactive music approach from La Casa de Papel: crossfading complete music variations instead of adding separate layers.', publishedMonth: '2026-07' },
    'Software-Architecture-in-Game-Music-Systems': { title: 'Game Music Architecture with Unity & Wwise | Jose Angulo', description: 'Jose Angulo separates gameplay, data and playback in a Unity and Wwise music system, making interactive audio easier to debug and maintain.', publishedMonth: '2026-09' }
};
export const posts = JSON.parse(read('posts.json')).map(post => {
    const stem = path.basename(post.link, '.html');
    const metadata = articleMetadata[stem];
    if (!metadata) throw new Error(`Add verified SEO metadata for ${post.link} in scripts/site.mjs`);
    const explicitDate = read(post.link).match(/<time\b[^>]*datetime="(\d{4}-\d{2}-\d{2})"/)?.[1];
    return { ...post, ...metadata, ...(explicitDate ? { datePublished: explicitDate } : {}), listingTitle: post.title, listingDescription: post.description, source: post.link, path: `/blog/${slugify(stem)}/` };
});
export const games = JSON.parse(read('games.json')).map(game => ({ ...game, slug: game.slug || slugify(game.title), path: `/projects/${game.slug || slugify(game.title)}/` }));
for (const game of games) if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug)) throw new Error(`Invalid project slug: ${game.slug}`);
if (new Set(games.map(game => game.path)).size !== games.length) throw new Error('Project URLs must be unique');

export function graphFor(page) {
    const url = origin + page.path;
    const pageId = `${url}#webpage`;
    const website = { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: 'joseisaudio', alternateName: ['Jose Angulo', 'Jose Angulo Audio'], inLanguage: 'en', publisher: { '@id': person['@id'] } };
    const webpage = { '@type': page.type || 'WebPage', '@id': pageId, url, name: page.title, description: page.description, inLanguage: 'en', isPartOf: { '@id': website['@id'] }, about: { '@id': person['@id'] }, primaryImageOfPage: { '@type': 'ImageObject', url: page.image || socialImage } };
    const graph = [website, webpage, person];
    if (page.type === 'ProfilePage') webpage.mainEntity = { '@id': person['@id'] };
    if (page.post) {
        const article = { '@type': 'BlogPosting', '@id': `${url}#article`, url, headline: page.headline, description: page.description, inLanguage: 'en', author: { '@id': person['@id'] }, publisher: { '@id': person['@id'] }, image: page.image || socialImage, mainEntityOfPage: { '@id': pageId }, isPartOf: { '@id': `${origin}/blog/#webpage` } };
        // Month-only display dates do not establish a publication day or timezone.
        for (const field of ['datePublished', 'dateModified']) if (page.post[field]) article[field] = page.post[field];
        graph.push(article);
        webpage.mainEntity = { '@id': article['@id'] };
    }
    if (page.game) {
        const game = page.game;
        const work = { '@type': 'CreativeWork', '@id': `${url}#portfolio-entry`, name: `${game.title} — audio portfolio entry`, description: game.description, author: { '@id': person['@id'] }, creditText: `${person.name}: ${game.role}`, image: origin + '/' + game.image, mainEntityOfPage: { '@id': pageId }, about: { '@type': game.id === 'REEL' ? 'CreativeWork' : 'VideoGame', name: game.title, ...(game.link ? { url: game.link } : {}) } };
        graph.push(work);
        webpage.mainEntity = { '@id': work['@id'] };
    }
    const items = page.path === '/projects/' ? games : page.path === '/blog/' ? posts : null;
    if (items) {
        const list = { '@type': 'ItemList', '@id': `${url}#list`, itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: origin + item.path, name: item.listingTitle || item.title })) };
        graph.push(list);
        webpage.mainEntity = { '@id': list['@id'] };
    }
    return { '@context': 'https://schema.org', '@graph': graph };
}

export function metadata(page) {
    const url = origin + page.path;
    const image = page.image || socialImage;
    return `<title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <link rel="canonical" href="${url}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="${page.post ? 'article' : 'website'}">
    <meta property="og:site_name" content="joseisaudio">
    <meta property="og:locale" content="en_US">
    <meta property="og:image" content="${image}">
    <meta property="og:image:alt" content="Jose Angulo — joseisaudio game audio portfolio">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="twitter:image" content="${image}">
    <meta name="twitter:image:alt" content="Jose Angulo — joseisaudio game audio portfolio">
    <script type="application/ld+json" id="page-schema">${json(graphFor(page))}</script>`;
}
