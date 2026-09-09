const state = {
    allGames: [],
    currentPage: 'hero',
    menuOpen: false,
    modalOpen: false,
    lastFocusedElement: null,
    soundNavigationId: 0
};

const SITE_BASE_URL = new URL('.', document.currentScript.src);
const SITE_DATA = JSON.parse(document.getElementById('site-data')?.textContent || 'null');
if (SITE_DATA) state.allGames = SITE_DATA.games;

const AUDIO_ASSETS = [
    ['ORCS MUST DIE', 'assets/snd/s_omd_click.opus'],
    ['TMNT', 'assets/snd/s_tmnt_click.opus'],
    ['KILLER KLOWNS', 'assets/snd/s_kkfos_click.opus'],
    ['AL-UMBRA', 'assets/snd/s_alumbra_click.opus'],
    ['NEKOME', 'assets/snd/s_nekome_click.opus'],
    ['THE SHADOW SYNDICATE', 'assets/snd/s_shadow_click.opus'],
    ['REEL', 'assets/snd/s_reel_click.opus'],
    ['MENU_IN', 'assets/snd/s_toggle_menu_in.opus'],
    ['MENU_OUT', 'assets/snd/s_toggle_menu_out.opus'],
    ['BUTTON_CLICK', 'assets/snd/s_button_click.opus'],
    ['BUTTON_BACK', 'assets/snd/s_button_back.opus'],
    ['BUTTON_TOGGLE', 'assets/snd/s_toggle.opus']
];

const MASTER_VOLUME = 0.6;
const NAVIGATION_SOUND_MS = 180;
const MAX_NAVIGATION_SOUND_WAIT_MS = 500;

const AudioManager = {
    audioCtx: null,
    masterGain: null,
    isMuted: false,
    sounds: new Map(),
    bufferPromises: new Map(),
    decodePromises: new Map(),
    preloadPromise: null,
    muteVersion: 0,

    startLoadingAssets() {
        if (!this.preloadPromise) {
            this.preloadPromise = Promise.all(AUDIO_ASSETS.map(([key, url]) => this.preloadBuffer(key, url)));
        }
        return this.preloadPromise;
    },

    preloadBuffer(key, url) {
        if (!this.bufferPromises.has(key)) {
            const promise = fetch(new URL(url, SITE_BASE_URL))
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.arrayBuffer();
                })
                .catch(error => {
                    this.bufferPromises.delete(key);
                    console.warn(`No se pudo cargar el audio ${url}.`, error);
                    return null;
                });
            this.bufferPromises.set(key, promise);
        }
        return this.bufferPromises.get(key);
    },

    loadSound(key) {
        if (this.sounds.has(key)) return Promise.resolve(this.sounds.get(key));
        const asset = AUDIO_ASSETS.find(([name]) => name === key);
        if (!asset || !this.audioCtx) return Promise.resolve(null);
        if (!this.decodePromises.has(key)) {
            const promise = this.preloadBuffer(...asset)
                .then(buffer => buffer ? this.audioCtx.decodeAudioData(buffer.slice(0)) : null)
                .then(sound => {
                    if (sound) this.sounds.set(key, sound);
                    return sound;
                })
                .catch(error => {
                    console.warn(`No se pudo decodificar el audio ${key}.`, error);
                    return null;
                })
                .finally(() => this.decodePromises.delete(key));
            this.decodePromises.set(key, promise);
        }
        return this.decodePromises.get(key);
    },

    async init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.audioCtx = new AudioContext();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = this.isMuted ? 0 : MASTER_VOLUME;
            this.masterGain.connect(this.audioCtx.destination);
        }
        // Resume inside the user gesture, before waiting for downloads or decoding.
        if (this.audioCtx.state !== 'running') await this.audioCtx.resume();
        AUDIO_ASSETS.forEach(([key]) => this.loadSound(key));
    },

    async play(key, volume = 1, randomPitch = false) {
        if (this.isMuted) return 0;
        const muteVersion = this.muteVersion;
        try {
            await this.init();
            const sound = await this.loadSound(key);
            if (!sound || this.isMuted || muteVersion !== this.muteVersion || this.audioCtx.state !== 'running') return 0;
            const source = this.audioCtx.createBufferSource();
            const gain = this.audioCtx.createGain();
            source.buffer = sound;
            gain.gain.value = volume ** 2;
            if (randomPitch) source.playbackRate.value = 0.9 + Math.random() * 0.2;
            source.connect(gain).connect(this.masterGain);
            source.onended = () => { source.disconnect(); gain.disconnect(); };
            source.start();
            return sound.duration / source.playbackRate.value;
        } catch (error) {
            console.warn(`No se pudo reproducir el audio ${key}.`, error);
            return 0;
        }
    },

    restoreMute() {
        try { this.isMuted = sessionStorage.getItem('sound-muted') === 'true'; } catch {}
        if (this.masterGain) this.masterGain.gain.value = this.isMuted ? 0 : MASTER_VOLUME;
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.muteVersion++;
        if (this.masterGain) this.masterGain.gain.value = this.isMuted ? 0 : MASTER_VOLUME;
        try { sessionStorage.setItem('sound-muted', String(this.isMuted)); } catch {}
        return this.isMuted;
    }
};

function getPage(id) {
    return document.querySelector(`.content-page[id="${CSS.escape(id)}"]`);
}

function updateScrollLock() {
    document.body.classList.toggle('no-scroll', state.menuOpen || state.modalOpen);
}

function activatePage(sectionId) {
    const target = getPage(sectionId);
    if (!target) return false;
    document.querySelectorAll('.content-page').forEach(page => page.classList.toggle('active', page === target));
    target.scrollTop = 0;
    window.scrollTo(0, 0);
    return true;
}

function getPageFromUrl() {
    const url = new URL(window.location.href);
    const sectionId = url.searchParams.get('page') || url.hash.slice(1);
    if (sectionId && getPage(sectionId)) return sectionId;
    const route = SITE_DATA?.routes[url.pathname];
    return route?.gameId ? (window.history.state?.projectPage || 'portfolio') : route?.section || 'hero';
}

function getPageUrl(sectionId) {
    const url = new URL(window.location.href);
    if (SITE_DATA) {
        url.pathname = SITE_DATA.sections[sectionId].path;
        url.searchParams.delete('page');
    } else if (sectionId === 'hero') url.searchParams.delete('page');
    else url.searchParams.set('page', sectionId);
    url.hash = '';
    return url;
}

function restorePageFromUrl() {
    state.soundNavigationId++;
    closeGameDetails(false);
    closeMobileMenu(false);
    state.currentPage = getPageFromUrl();
    activatePage(state.currentPage);
    const route = SITE_DATA?.routes[window.location.pathname];
    if (route?.gameId) openGameDetails(route.gameId, false);
    updateRouteMetadata();
}

function updateRouteMetadata() {
    const route = SITE_DATA?.routes[window.location.pathname];
    if (!route) return;
    document.title = route.title;
    const canonical = 'https://joseisaudio.com' + window.location.pathname;
    document.querySelector('link[rel="canonical"]').href = canonical;
    for (const [selector, content] of Object.entries({
        'meta[name="description"]': route.description,
        'meta[property="og:title"]': route.title,
        'meta[property="og:description"]': route.description,
        'meta[property="og:url"]': canonical,
        'meta[name="twitter:title"]': route.title,
        'meta[name="twitter:description"]': route.description
    })) document.querySelector(selector)?.setAttribute('content', content);
    document.getElementById('page-schema').textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [...SITE_DATA.entities, ...route.schema] });
    const primary = state.modalOpen ? document.getElementById('game-title') : document.querySelector(`#${state.currentPage} h1, #${state.currentPage} h2`);
    document.querySelectorAll('h1, #game-title').forEach(heading => {
        if (heading !== primary && heading.tagName === 'H1') replaceHeading(heading, 'h2');
    });
    if (primary && primary.tagName !== 'H1') replaceHeading(primary, 'h1');
}

function replaceHeading(heading, tag) {
    const replacement = document.createElement(tag);
    for (const attribute of heading.attributes) replacement.setAttribute(attribute.name, attribute.value);
    replacement.append(...heading.childNodes);
    heading.replaceWith(replacement);
}

function initializeNavigation() {
    // Articles share this script but keep their own document URLs.
    if (!getPage('hero')) return;
    const sectionId = getPageFromUrl();
    const projectRoute = SITE_DATA?.routes[window.location.pathname]?.gameId;
    window.history.replaceState({
        ...window.history.state,
        sectionIndex: window.history.state?.sectionIndex ?? 0
    }, '', projectRoute ? window.location.href : getPageUrl(sectionId));
    restorePageFromUrl();
    window.addEventListener('popstate', restorePageFromUrl);
}

function showPage(sectionId) {
    if (!getPage(sectionId)) return;
    closeMobileMenu(false);
    if (sectionId === state.currentPage && !state.modalOpen) return;
    window.history.pushState({
        ...window.history.state,
        sectionIndex: (window.history.state?.sectionIndex ?? 0) + 1
    }, '', getPageUrl(sectionId));
    restorePageFromUrl();
}

function goBack() {
    closeGameDetails(false);
    closeMobileMenu(false);
    // A direct section link has no earlier section in this document.
    if (window.history.state?.sectionIndex > 0) window.history.back();
    else showPage('hero');
}

function makeImage(src, alt, className) {
    const image = document.createElement('img');
    image.src = src;
    image.alt = alt;
    image.className = className;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
        image.src = 'assets/img/portfolio/placeholder.avif';
    }, { once: true });
    return image;
}

function renderStickers() {
    const layer = document.getElementById('dynamic-stickers');
    if (!layer) return;
    const mobile = window.matchMedia('(max-width: 1024px)').matches;
    const stickersLayer = layer.closest('.stickers-layer');
    const hero = layer.closest('#hero');

    // The desktop artwork is laid out on a 1440px-wide canvas. Scale that
    // canvas continuously with the viewport so the stickers keep their
    // spacing instead of crowding together before the mobile breakpoint.
    if (stickersLayer) {
        const desktopScale = 0.85 * Math.min(window.innerWidth / 1440, 1);
        stickersLayer.style.setProperty('--stickers-scale', desktopScale.toFixed(4));
    }
    if (hero) {
        const desktopUiScale = Math.max(0.72, Math.min(window.innerWidth / 1440, 1));
        hero.style.setProperty('--hero-ui-scale', desktopUiScale.toFixed(4));
    }
    if (layer.hasAttribute('data-static')) return;
    const labelColors = { TMNT: '#f1b83a', 'KILLER KLOWNS': '#00b4eb', 'AL-UMBRA': '#00b4eb', INNER: '#f1b83a' };
    const fragment = document.createDocumentFragment();

    state.allGames.filter(game => game.isSticker).forEach((game, index) => {
        const sticker = document.createElement('a');
        sticker.href = game.path || '#';
        sticker.className = `sticker game-${index + 1}`;
        sticker.dataset.gameId = game.id;
        sticker.dataset.sound = game.id;
        sticker.setAttribute('aria-label', `Abrir proyecto: ${game.title}`);
        sticker.style.width = mobile ? 'var(--compact-sticker-size, 80px)' : (game.stickerWidth || '140px');
        sticker.style.height = mobile ? 'var(--compact-sticker-size, 80px)' : (game.stickerHeight || '140px');
        sticker.style.left = mobile ? (game.stickerLeftMobile || `${15 + index * 20}%`) : (game.stickerLeft || '50%');
        sticker.style.top = mobile ? (game.stickerTopMobile || `${65 + index * 4}%`) : (game.stickerTop || '50%');
        sticker.style.transform = mobile ? 'translate(-50%, -50%)' : `rotate(${game.stickerRotate || 0}deg)`;
        const thumbnail = makeImage(new URL(game.stickerImage || game.image || 'assets/img/portfolio/placeholder.avif', SITE_BASE_URL).href, '', 'sticker-thumb');
        thumbnail.loading = 'eager';
        sticker.append(thumbnail);
        const label = document.createElement('span');
        label.className = 'sticker-label';
        label.textContent = game.id;
        label.style.color = labelColors[game.id] || '#ffffff';
        sticker.append(label);
        fragment.append(sticker);
    });
    layer.replaceChildren(fragment);
}

function renderPortfolio() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    const fragment = document.createDocumentFragment();
    state.allGames.forEach(game => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'work-card';
        card.dataset.gameId = game.id;
        card.dataset.sound = 'BUTTON_CLICK';
        card.setAttribute('aria-label', `Ver detalles de ${game.title}`);
        if (game.image) card.append(makeImage(game.image, game.title, 'work-image'));
        else card.append(Object.assign(document.createElement('div'), { className: 'no-image-placeholder' }));
        const overlay = Object.assign(document.createElement('div'), { className: 'work-info-overlay' });
        const title = document.createElement('h3'); title.textContent = game.title;
        const studio = document.createElement('p'); studio.textContent = game.studio;
        overlay.append(title, studio);
        card.append(overlay);
        fragment.append(card);
    });
    grid.replaceChildren(fragment);
}

function renderBlog(posts) {
    const blogList = document.getElementById('blog-list');
    if (!blogList) return;
    const fragment = document.createDocumentFragment();
    posts.forEach(post => {
        const card = Object.assign(document.createElement('article'), { className: 'blog-card' });
        const link = Object.assign(document.createElement('a'), { className: 'blog-link', href: post.link });
        link.dataset.sound = 'BUTTON_CLICK';
        const date = Object.assign(document.createElement('span'), { className: 'blog-date', textContent: post.date });
        const title = document.createElement('h3'); title.textContent = post.title;
        const description = document.createElement('p'); description.textContent = post.description;
        link.append(date, title, description); card.append(link); fragment.append(card);
    });
    blogList.replaceChildren(fragment);
}

async function loadInitialData() {
    if (SITE_DATA) { renderStickers(); return; }
    const [gamesResponse, postsResponse] = await Promise.all([fetch(new URL('games.json', SITE_BASE_URL)), fetch(new URL('posts.json', SITE_BASE_URL))]);
    if (!gamesResponse.ok || !postsResponse.ok) throw new Error('No se pudieron cargar los datos del sitio.');
    state.allGames = await gamesResponse.json();
    renderStickers(); renderPortfolio(); renderBlog(await postsResponse.json());
}

function openGameDetails(gameId, updateHistory = true) {
    const game = state.allGames.find(item => item.id === gameId);
    const overlay = document.getElementById('game-overlay');
    if (!game || !overlay) return;
    if (SITE_DATA && updateHistory) {
        const url = new URL(game.path, window.location.href);
        window.history.pushState({ ...window.history.state, sectionIndex: (window.history.state?.sectionIndex ?? 0) + 1, projectPage: state.currentPage, projectOrigin: window.location.href }, '', url);
    }
    state.lastFocusedElement = document.activeElement;
    if (!updateHistory && overlay.classList.contains('active') && document.getElementById('game-title').textContent === game.title) {
        state.modalOpen = true; updateScrollLock(); return;
    }
    document.getElementById('game-title').textContent = game.title;
    document.getElementById('game-studio').textContent = game.studio;
    document.getElementById('game-role').textContent = game.role;
    document.getElementById('game-description').textContent = game.description;
    document.getElementById('game-tech').textContent = game.tech || 'N/A';
    document.getElementById('game-platforms').textContent = game.platforms || 'TBA';
    const media = document.getElementById('media-container');
    media.replaceChildren();
    if (game.video) {
        const frame = document.createElement('iframe');
        frame.src = game.video; frame.title = `Video de ${game.title}`; frame.allowFullscreen = true;
        frame.loading = 'lazy'; frame.style.cssText = 'width:100%; aspect-ratio:16/9; border:0;';
        media.append(frame);
    } else media.append(makeImage(new URL(game.image || 'assets/img/portfolio/placeholder.avif', SITE_BASE_URL).href, game.title, 'game-media-image'));
    overlay.classList.add('active'); overlay.setAttribute('aria-hidden', 'false');
    state.modalOpen = true; updateScrollLock();
    overlay.querySelector('[data-action="close-modal"]').focus();
    updateRouteMetadata();
}

function closeGameDetails(navigate = true) {
    const overlay = document.getElementById('game-overlay');
    if (!overlay || !state.modalOpen) return;
    if (navigate && SITE_DATA?.routes[window.location.pathname]?.gameId) {
        if (window.history.state?.projectOrigin && window.history.state?.sectionIndex > 0) window.history.back();
        else showPage('portfolio');
        return;
    }
    overlay.classList.remove('active'); overlay.setAttribute('aria-hidden', 'true');
    document.getElementById('media-container').replaceChildren();
    state.modalOpen = false; updateScrollLock();
    state.lastFocusedElement?.focus();
}

function toggleMobileMenu() {
    if (!window.matchMedia('(max-width: 1024px)').matches) return;
    state.menuOpen ? closeMobileMenu() : openMobileMenu();
}

function openMobileMenu() {
    const menu = document.getElementById('mobileNavMenu');
    const trigger = document.querySelector('.hamburger-menu');
    if (!menu) return;
    state.menuOpen = true; menu.classList.add('open'); trigger?.setAttribute('aria-expanded', 'true'); updateScrollLock();
    AudioManager.play('MENU_IN', 0.8, true);
}

function closeMobileMenu(playSound = true) {
    const menu = document.getElementById('mobileNavMenu');
    const trigger = document.querySelector('.hamburger-menu');
    if (!menu || !state.menuOpen) return;
    state.menuOpen = false; menu.classList.remove('open'); trigger?.setAttribute('aria-expanded', 'false'); updateScrollLock();
    if (playSound) AudioManager.play('MENU_OUT', 0.5, true);
}

async function handleSound(target) {
    const mute = target.closest('[data-action="toggle-mute"]');
    const interactive = target.closest('[data-sound], [data-page], [data-action], .hamburger-menu');
    if (!interactive) return 0;
    if (mute) {
        updateMuteVisuals(AudioManager.toggleMute());
        return AudioManager.play('BUTTON_TOGGLE', 1, true);
    }
    if (interactive.matches('.sticker[data-sound]')) return AudioManager.play(interactive.dataset.sound, 0.5, true);
    if (interactive.dataset.sound) return AudioManager.play(interactive.dataset.sound, 0.8, true);
    if (interactive.matches('[data-action="back"]')) return AudioManager.play('BUTTON_BACK', 0.9, true);
    if (interactive.matches('[data-page]')) return AudioManager.play('BUTTON_CLICK', 0.9, true);
    return 0;
}

function afterNavigationSound(sound, navigate) {
    const navigationId = ++state.soundNavigationId;
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (navigationId === state.soundNavigationId) navigate();
    };
    // A failed or slow audio request must never prevent leaving the page.
    const timeout = setTimeout(finish, MAX_NAVIGATION_SOUND_WAIT_MS);
    sound.then(duration => {
        if (duration > 0) setTimeout(finish, Math.min(duration * 1000, NAVIGATION_SOUND_MS));
        else finish();
    }, finish);
}

function updateMuteVisuals(isMuted) {
    document.querySelectorAll('.mute-btn, .hero-mute-btn').forEach(button => {
        button.classList.toggle('muted', isMuted);
        button.setAttribute('aria-pressed', String(isMuted));
    });
    document.querySelectorAll('.mute-line-bottom').forEach(text => { text.textContent = isMuted ? 'OFF' : 'ON'; });
    const icon = document.querySelector('#mute-icon img');
    if (icon) {
        icon.src = new URL(isMuted ? 'assets/img/buttons/btn-volume-off.svg' : 'assets/img/buttons/btn-volume-on.svg', SITE_BASE_URL).href;
        icon.alt = isMuted ? 'Sound off' : 'Sound on';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initializeNavigation();
    AudioManager.restoreMute();
    updateMuteVisuals(AudioManager.isMuted);
    AudioManager.startLoadingAssets();

    window.addEventListener('pagehide', () => { state.soundNavigationId++; });
    window.addEventListener('pageshow', () => {
        AudioManager.restoreMute();
        updateMuteVisuals(AudioManager.isMuted);
    });

    let resizeFrame;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(renderStickers);
        if (!window.matchMedia('(max-width: 1024px)').matches) closeMobileMenu(false);
    });

    document.addEventListener('click', event => {
        if (event.defaultPrevented) return;
        const target = event.target;
        const pageControl = target.closest('[data-page]');
        const gameControl = target.closest('[data-game-id]');
        const action = target.closest('[data-action]');
        const link = target.closest('a[href]');
        const followsHere = link && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey &&
            !link.hasAttribute('download') && (!link.target || link.target === '_self');
        if ((pageControl || gameControl) && link && !followsHere) return;
        state.soundNavigationId++;
        // Valid form submissions play once in the submit handler, including Enter.
        const submitControl = target.closest('.contact-form [type="submit"]');
        if (submitControl) {
            if (submitControl.form.matches(':invalid')) handleSound(target);
            return;
        }
        const leavesPage = followsHere && !pageControl && !gameControl && !action && link.dataset.sound && !AudioManager.isMuted &&
            /^https?:$/.test(link.protocol) &&
            (link.origin !== location.origin || link.pathname !== location.pathname || link.search !== location.search);
        // Cancel native navigation during the click, before any audio awaits.
        if (pageControl || gameControl || (action && link) || leavesPage) event.preventDefault();
        const sound = handleSound(target);
        if (leavesPage) {
            const destination = link.href;
            afterNavigationSound(sound, () => window.location.assign(destination));
        }
        if (pageControl) showPage(pageControl.dataset.page);
        else if (gameControl) openGameDetails(gameControl.dataset.gameId);
        else if (action?.dataset.action === 'back') goBack();
        else if (action?.dataset.action === 'close-modal') closeGameDetails();
        else if (target.closest('.hamburger-menu')) toggleMobileMenu();
        else if (state.menuOpen && !target.closest('#mobileNavMenu')) closeMobileMenu();
        else if (state.modalOpen && target === document.getElementById('game-overlay')) closeGameDetails();
    });

    let submittingForm = null;
    document.addEventListener('submit', event => {
        const form = event.target;
        if (!form.matches('.contact-form') || event.defaultPrevented || submittingForm === form) return;
        event.preventDefault();
        const submitter = event.submitter;
        afterNavigationSound(AudioManager.play('BUTTON_CLICK', 0.8, true), () => {
            submittingForm = form;
            try { form.requestSubmit(submitter); } finally { submittingForm = null; }
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Tab' && state.modalOpen) {
            const focusable = [...document.querySelectorAll('#game-overlay button, #game-overlay a, #game-overlay iframe')];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            return;
        }
        if (event.key !== 'Escape') return;
        if (state.modalOpen) closeGameDetails();
        else if (state.menuOpen) closeMobileMenu();
    });

    // Navigation must work even while portfolio and blog data are loading.
    if (getPage('hero')) {
        try { await loadInitialData(); } catch (error) { console.error(error); }
    }
});
