const state = {
    allGames: [],
    navigationHistory: [],
    currentPage: 'hero',
    menuOpen: false,
    modalOpen: false,
    lastFocusedElement: null
};

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

const AudioManager = {
    audioCtx: null,
    masterGain: null,
    isMuted: false,
    sounds: new Map(),
    preloadPromise: null,

    startLoadingAssets() {
        if (!this.preloadPromise) {
            this.preloadPromise = Promise.all(AUDIO_ASSETS.map(([key, url]) => this.preloadBuffer(key, url)));
        }
        return this.preloadPromise;
    },

    async preloadBuffer(key, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            this.sounds.set(key, this.audioCtx ? await this.decode(buffer) : buffer);
        } catch (error) {
            console.warn(`No se pudo cargar el audio ${url}.`, error);
        }
    },

    async decode(buffer) {
        try {
            return await this.audioCtx.decodeAudioData(buffer.slice(0));
        } catch (error) {
            console.warn('No se pudo decodificar un audio.', error);
            return null;
        }
    },

    async init() {
        if (this.audioCtx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 1;
        this.masterGain.connect(this.audioCtx.destination);

        await Promise.all([...this.sounds.entries()].map(async ([key, sound]) => {
            if (sound instanceof ArrayBuffer) this.sounds.set(key, await this.decode(sound));
        }));
    },

    play(key, volume = 1, randomPitch = false) {
        const sound = this.sounds.get(key);
        if (!this.audioCtx || !sound || sound instanceof ArrayBuffer) return;
        const source = this.audioCtx.createBufferSource();
        const gain = this.audioCtx.createGain();
        source.buffer = sound;
        gain.gain.value = volume ** 2;
        if (randomPitch) source.playbackRate.value = 0.9 + Math.random() * 0.2;
        source.connect(gain).connect(this.masterGain);
        source.start();
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) this.masterGain.gain.value = this.isMuted ? 0 : 1;
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

function showPage(sectionId) {
    if (!getPage(sectionId) || sectionId === state.currentPage) return;
    closeGameDetails();
    state.navigationHistory.push(state.currentPage);
    state.currentPage = sectionId;
    activatePage(sectionId);
    closeMobileMenu(false);
}

function goBack() {
    closeGameDetails();
    const previousPage = state.navigationHistory.pop() || 'hero';
    state.currentPage = previousPage;
    activatePage(previousPage);
    closeMobileMenu(false);
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
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const labelColors = { TMNT: '#f1b83a', 'KILLER KLOWNS': '#00b4eb', 'AL-UMBRA': '#00b4eb', INNER: '#f1b83a' };
    const fragment = document.createDocumentFragment();

    state.allGames.filter(game => game.isSticker).forEach((game, index) => {
        const sticker = document.createElement('button');
        sticker.type = 'button';
        sticker.className = `sticker game-${index + 1}`;
        sticker.dataset.gameId = game.id;
        sticker.dataset.sound = game.id;
        sticker.setAttribute('aria-label', `Abrir proyecto: ${game.title}`);
        sticker.style.width = mobile ? '80px' : (game.stickerWidth || '140px');
        sticker.style.height = mobile ? '80px' : (game.stickerHeight || '140px');
        sticker.style.left = mobile ? (game.stickerLeftMobile || `${15 + index * 20}%`) : (game.stickerLeft || '50%');
        sticker.style.top = mobile ? (game.stickerTopMobile || `${65 + index * 4}%`) : (game.stickerTop || '50%');
        sticker.style.transform = mobile ? 'translate(-50%, -50%)' : `rotate(${game.stickerRotate || 0}deg)`;
        sticker.append(makeImage(game.stickerImage || game.image || 'assets/img/portfolio/placeholder.avif', '', 'sticker-thumb'));
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
        const date = Object.assign(document.createElement('span'), { className: 'blog-date', textContent: post.date });
        const title = document.createElement('h3'); title.textContent = post.title;
        const description = document.createElement('p'); description.textContent = post.description;
        link.append(date, title, description); card.append(link); fragment.append(card);
    });
    blogList.replaceChildren(fragment);
}

async function loadInitialData() {
    const [gamesResponse, postsResponse] = await Promise.all([fetch('games.json'), fetch('posts.json')]);
    if (!gamesResponse.ok || !postsResponse.ok) throw new Error('No se pudieron cargar los datos del sitio.');
    state.allGames = await gamesResponse.json();
    renderStickers(); renderPortfolio(); renderBlog(await postsResponse.json());
}

function openGameDetails(gameId) {
    const game = state.allGames.find(item => item.id === gameId);
    const overlay = document.getElementById('game-overlay');
    if (!game || !overlay) return;
    state.lastFocusedElement = document.activeElement;
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
    } else media.append(makeImage(game.image || 'assets/img/portfolio/placeholder.avif', game.title, 'game-media-image'));
    overlay.classList.add('active'); overlay.setAttribute('aria-hidden', 'false');
    state.modalOpen = true; updateScrollLock();
    overlay.querySelector('[data-action="close-modal"]').focus();
}

function closeGameDetails() {
    const overlay = document.getElementById('game-overlay');
    if (!overlay || !state.modalOpen) return;
    overlay.classList.remove('active'); overlay.setAttribute('aria-hidden', 'true');
    document.getElementById('media-container').replaceChildren();
    state.modalOpen = false; updateScrollLock();
    state.lastFocusedElement?.focus();
}

function toggleMobileMenu() {
    if (!window.matchMedia('(max-width: 768px)').matches) return;
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
    if (!interactive) return;
    await AudioManager.init();
    if (AudioManager.audioCtx.state === 'suspended') await AudioManager.audioCtx.resume();
    if (mute) {
        updateMuteVisuals(AudioManager.toggleMute());
        AudioManager.play('BUTTON_TOGGLE', 1, true);
    } else if (interactive.dataset.sound) AudioManager.play(interactive.dataset.sound, 0.8, true);
    else if (interactive.matches('[data-action="back"]')) AudioManager.play('BUTTON_BACK', 0.9, true);
    else if (interactive.matches('[data-page]')) AudioManager.play('BUTTON_CLICK', 0.9, true);
}

function updateMuteVisuals(isMuted) {
    document.querySelectorAll('.mute-btn, .hero-mute-btn').forEach(button => {
        button.classList.toggle('muted', isMuted);
        button.setAttribute('aria-pressed', String(isMuted));
    });
    document.querySelectorAll('.mute-line-bottom').forEach(text => { text.textContent = isMuted ? 'OFF' : 'ON'; });
    const icon = document.querySelector('#mute-icon img');
    if (icon) {
        icon.src = isMuted ? 'assets/img/buttons/btn-volume-off.svg' : 'assets/img/buttons/btn-volume-on.svg';
        icon.alt = isMuted ? 'Sound off' : 'Sound on';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const targetPage = new URLSearchParams(window.location.search).get('page');
    if (targetPage && getPage(targetPage)) { state.currentPage = targetPage; activatePage(targetPage); }
    AudioManager.startLoadingAssets();
    try { await loadInitialData(); } catch (error) { console.error(error); }

    let resizeFrame;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(renderStickers);
        if (!window.matchMedia('(max-width: 768px)').matches) closeMobileMenu(false);
    });

    document.addEventListener('click', async event => {
        const target = event.target;
        const pageControl = target.closest('[data-page]');
        const gameControl = target.closest('[data-game-id]');
        const action = target.closest('[data-action]');
        await handleSound(target);
        if (pageControl) { event.preventDefault(); showPage(pageControl.dataset.page); }
        else if (gameControl) openGameDetails(gameControl.dataset.gameId);
        else if (action?.dataset.action === 'back') goBack();
        else if (action?.dataset.action === 'close-modal') closeGameDetails();
        else if (target.closest('.hamburger-menu')) toggleMobileMenu();
        else if (state.menuOpen && !target.closest('#mobileNavMenu')) closeMobileMenu();
        else if (state.modalOpen && target === document.getElementById('game-overlay')) closeGameDetails();
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
});
