let allGames = [];
let navigationHistory = [];
let currentPage = 'hero';

function showPage(sectionId) {
    // Si ya estamos en esa página, no hacemos nada
    if (sectionId === currentPage) return;
    
    closeGameDetails();
    
    // 2. Guardamos la página actual en el historial antes de abandonarla
    if (currentPage) {
        navigationHistory.push(currentPage);
    }
    
    // 3. Actualizamos la página actual con el nuevo ID
    currentPage = sectionId;

    // 4. Apagamos todas las páginas existentes
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });

    // 5. Encendemos la sección destino
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        target.scrollTop = 0;
    }

    if (window.innerWidth <= 768) {
        const menu = document.getElementById('mobileNavMenu');
        if (menu && menu.classList.contains('open')) {
            menu.classList.remove('open');
            document.body.classList.remove('no-scroll');
            document.body.style.overflow = '';
        }
    }
}

// FUNCIÓN DINÁMICA PARA EL BOTÓN BACK
function goBack() {

    if (navigationHistory.length > 0) {
        // Sacamos la última página guardada
        const previousPage = navigationHistory.pop();
        
        // Ejecutamos el cambio visual saltándonos el flujo normal de showPage para no duplicar el historial
        closeGameDetails();
        currentPage = previousPage;
        
        document.querySelectorAll('.content-page').forEach(page => {
            page.classList.remove('active');
        });
        
        const target = document.getElementById(previousPage);
        if (target) {
            target.classList.add('active');
            target.scrollTop = 0;
        }
    } else {
        // Por seguridad, si el historial se vacía, te manda de vuelta al inicio (hero)
        showPage('hero');
        navigationHistory = []; 
    }
}

async function loadInitialData() {
    try {
        const [gamesRes, postsRes] = await Promise.all([
            fetch('games.json'),
            fetch('posts.json')
        ]);
        
        allGames = await gamesRes.json();
        const posts = await postsRes.json();

        renderStickers();
        renderPortfolio();
        renderBlog(posts);

        AudioManager.startLoadingAssets();

    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

function renderStickers() {
    const layer = document.getElementById('dynamic-stickers'); 
    if (!layer) return;
    
    const stickerGames = allGames.filter(g => g.isSticker);
    const placeholder = 'assets/img/portfolio/placeholder.avif';
    const isMobile = window.innerWidth < 768;

    layer.innerHTML = stickerGames.map((game, index) => {
        const imgSrc = game.stickerImage || game.image || placeholder; 
            
        let width = game.stickerWidth || '140px';
        let height = game.stickerHeight || '140px';
        let leftPos = game.stickerLeft || '50%';
        let topPos = game.stickerTop || '50%';
        let rotation = game.stickerRotate || '0';
        
        let transformBase = `rotate(${rotation}deg)`;

        if (isMobile) {
            width = '80px'; 
            height = '80px';  
            leftPos = game.stickerLeftMobile || `${15 + (index * 20)}%`; 
            topPos = game.stickerTopMobile || `${65 + (index * 4)}%`;     
            transformBase = `translate(-50%, -50%) rotate(0deg)`;
        }
        
        const style = `
            position: absolute;
            width: ${width};
            height: ${height};
            top: ${topPos};
            left: ${leftPos};
            transform: ${transformBase};
            pointer-events: auto;
        `;

        let labelColor = '#ffffff';
        if(game.id === 'INNER') labelColor = '#f1b83a'; 
        if(game.id === 'TMNT') labelColor = '#f1b83a';
        if(game.id === 'KILLER KLOWNS') labelColor = '#00b4eb'; 
        if(game.id === 'AL-UMBRA') labelColor = '#00b4eb';

        return `
            <div class="sticker ${'game-' + (index + 1)}" 
                 onclick="openGameDetails('${game.id}')" 
                 data-sound="${game.id}"
                 style="${style}">
                <img src="${imgSrc}" class="sticker-thumb" onerror="this.src='${placeholder}';">
                <div class="sticker-label" style="color: ${labelColor};">${game.id}</div>
            </div>
        `;
    }).join('');
}

function renderPortfolio() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    grid.innerHTML = allGames.map(game => {
        const hasImage = game.image && game.image.trim() !== "";
        const imgHtml = hasImage 
            ? `<img src="${game.image}" alt="${game.title}" onerror="this.style.display='none'; this.parentElement.classList.add('no-image');">`
            : `<div class="no-image-placeholder"></div>`;
        
        return `
        <div class="work-card" onclick="openGameDetails('${game.id}')">
            ${imgHtml}
            <div class="work-info-overlay">
                <h3>${game.title}</h3>
                <p>${game.studio}</p>
            </div>
        </div>`;
    }).join('');
}

function renderBlog(posts) {
    const blogList = document.getElementById('blog-list');
    if (!blogList) return;

    blogList.innerHTML = posts.map(post => `
        <div class="blog-card">
            <a href="${post.link}" class="blog-link">
                <span class="blog-date">${post.date}</span>
                <h3>${post.title}</h3>
                <p>${post.description}</p>
            </a>
        </div>
    `).join('');
}

function openGameDetails(gameId) {
    const game = allGames.find(g => g.id === g.gameId || g.id === gameId);
    if (!game) return;

    document.getElementById('game-title').innerText = game.title;
    document.getElementById('game-studio').innerText = game.studio;
    document.getElementById('game-role').innerText = game.role;
    document.getElementById('game-description').innerText = game.description;
    document.getElementById('game-tech').innerText = game.tech || "N/A";
    document.getElementById('game-platforms').innerText = game.platforms || "TBA";

    const media = document.getElementById('media-container');
    if (game.video) {
        media.innerHTML = `<iframe src="${game.video}" frameborder="0" allowfullscreen style="width:100%; aspect-ratio:16/9;"></iframe>`;
    } else {
        media.innerHTML = `<img src="${game.image || 'assets/portfolio/placeholder.avif'}" style="width:100%; border-radius:8px;">`;
    }

    const overlay = document.getElementById('game-overlay');
    if(overlay){
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        overlay.onclick = function(event) {
            if (event.target === overlay) {
                closeGameDetails();
            }
        };
    }
}

function closeGameDetails() {
    const overlay = document.getElementById('game-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        setTimeout(() => {
            document.getElementById('media-container').innerHTML = '';
        }, 600);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Detectar INMEDIATAMENTE si venimos con un parámetro (?page=...)
    const urlParams = new URLSearchParams(window.location.search);
    const targetPage = urlParams.get('page');

    if (targetPage) {
        showPage(targetPage);
    } else {
        showPage('hero'); 
    }

    // 2. Cargamos los datos iniciales e iniciamos precarga de audios
    loadInitialData();
});

function toggleMobileMenu() {
    if (window.innerWidth <= 768) {
        const menu = document.getElementById('mobileNavMenu');
        const body = document.body;
        
        menu.classList.toggle('open');
        
        if (menu.classList.contains('open')) {
            body.classList.add('no-scroll');
            body.style.overflow = 'hidden'; 

            AudioManager.play('MENU_IN', 0.8, true);
            console.log("Menu in")
        } else {
            body.classList.remove('no-scroll');
            body.style.overflow = ''; 
            AudioManager.play('MENU_OUT', 0.5, true);
            console.log("Menu out")

        }
    }
}
// ESCUCHAR CLICS DE STICKERS Y BOTONES CON REACCIÓN INSTANTÁNEA
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();

    window.addEventListener('resize', () => {
        renderStickers();
    });
});

// 🎯 DETECTOR GLOBAL DE CLICS PARA EL MENÚ MÓVIL
document.addEventListener('click', async (e) => {
    const menu = document.getElementById('mobileNavMenu');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (menu && menu.classList.contains('open')) {
        if (hamburger && hamburger.contains(e.target)) {
            return;
        }
        if (e.target.tagName !== 'A') {
            menu.classList.remove('open');
            document.body.classList.remove('no-scroll');
            document.body.style.overflow = '';
        }
    }
});

const AudioManager = {
    audioCtx: null,
    masterGain: null,
    isMuted: false, 
    sounds: {},    

    // 1. Descarga los archivos en crudo (.arrayBuffer) sin activar el AudioContext
    async startLoadingAssets() {
        const assetsToPreload = [
            { key: 'ORCS MUST DIE', url: '/assets/snd/s_omd_click.opus' },
            { key: 'TMNT', url: '/assets/snd/s_tmnt_click.opus' },
            { key: 'KILLER KLOWNS', url: '/assets/snd/s_kkfos_click.opus' },
            { key: 'AL-UMBRA', url: '/assets/snd/s_alumbra_click.opus' },
            { key: 'NEKOME', url: '/assets/snd/s_nekome_click.opus' },
            { key: 'THE SHADOW SYNDICATE', url: '/assets/snd/s_shadow_click.opus' },
            { key: 'REEL', url: '/assets/snd/s_reel_click.opus'},

            { key: 'MENU_IN', url: '/assets/snd/s_toggle_menu_out.opus' },
            { key: 'MENU_OUT', url: '/assets/snd/s_toggle_menu_in.opus' },
            { key: 'BUTTON_CLICK', url: '/assets/snd/s_button_back.opus' },
            { key: 'BUTTON_BACK', url: '/assets/snd/s_button_click.opus' },
            { key: 'BUTTON_TOGGLE', url: '/assets/snd/s_toggle.opus'}
        ];

        await Promise.all(assetsToPreload.map(asset => this.preloadBuffer(asset.key, asset.url)));
        console.log("Binarios de audio precargados en memoria RAM.");
    },

    async preloadBuffer(key, url) {
        try {
            const response = await fetch(url);
            this.sounds[key] = await response.arrayBuffer();
        } catch (error) {
            console.warn(`No se pudo precargar el buffer: ${url}`, error);
        }
    },

    // 2. Se ejecuta síncronamente al primer clic para armar el ruteo y decodificar instantáneamente
    async init() {
        if (this.audioCtx) return; 

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();

        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);

        // Decodificación flash de los buffers que ya están en memoria
        for (const key in this.sounds) {
            if (this.sounds[key] instanceof ArrayBuffer) {
                try {
                    this.sounds[key] = await this.audioCtx.decodeAudioData(this.sounds[key]);
                } catch (err) {
                    console.error(`Error decodificando el asset: ${key}`, err);
                }
            }
        }
    },

    play(key, volume = 1, randomPitch = false) {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // Si no está listo o sigue siendo un ArrayBuffer sin decodificar, salimos de seguridad
        if (!this.audioCtx || !this.sounds[key] || this.sounds[key] instanceof ArrayBuffer) return;

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.sounds[key];

        if(randomPitch){
            const minPitch = 0.90;
            const maxPitch = 1.10;
            const randomFactor = Math.random() * (maxPitch - minPitch) + minPitch;

            source.playbackRate.setValueAtTime(randomFactor, this.audioCtx.currentTime);
        }
        const voiceGain = this.audioCtx.createGain();
        voiceGain.gain.setValueAtTime(volume * volume, this.audioCtx.currentTime);
        source.connect(voiceGain);
        voiceGain.connect(this.masterGain);

        source.start(0);
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.audioCtx) {
            const targetVolume = this.isMuted ? 0 : 1;
            this.masterGain.gain.setValueAtTime(targetVolume, this.audioCtx.currentTime);
        }
        return this.isMuted; 
    }
};

async function toggleGlobalMute(event) {
    if (event) event.stopPropagation(); // Evita interrupciones en el canvas de stickers
    
    if (!AudioManager.audioCtx) {
        await AudioManager.init();
    }
    
    // Cambia el estado del hardware y nos dice si quedó en mute (true/false)
    const isMuted = AudioManager.toggleMute();
    
    // Despierta el contexto si el navegador lo tenía en pausa
    if (!isMuted && AudioManager.audioCtx && AudioManager.audioCtx.state === 'suspended') {
        AudioManager.audioCtx.resume();
    }

    AudioManager.play('BUTTON_TOGGLE', 1, true);
    // Pasamos el estado a la capa visual para que refresque la pantalla
    updateMuteVisuals(isMuted);
}

// 2. CAPA VISUAL: Se encarga de pintar la UI en base al estado del motor
function updateMuteVisuals(isMuted) {
    // Capturamos todos los contenedores de botón de mute que existan
    const muteBtns = document.querySelectorAll('.mute-btn, .hero-mute-btn');
    const statusTexts = document.querySelectorAll('.mute-line-bottom, #mute-text');
    const muteIcons = document.querySelectorAll('#mute-icon');

    // Cambiamos las clases de estado a todos los botones encontrados
    muteBtns.forEach(btn => {
        if (isMuted) {
            btn.classList.add('muted');
        } else {
            btn.classList.remove('muted');
        }
    });

    // Actualizamos los textos (ON / OFF / SOUND ON / SOUND OFF)
    statusTexts.forEach(text => {
        if (text.id === 'mute-text') {
            text.innerText = isMuted ? 'SOUND OFF' : 'SOUND ON';
        } else {
            text.innerText = isMuted ? 'OFF' : 'ON';
        }
    });

    // 🎛️ NUEVA LÓGICA: Inyección mediante archivos .svg externos
    muteIcons.forEach(icon => {
        if (isMuted) {
            // Ruta al SVG de volumen apagado (usa '../' por si estás en la carpeta blog)
            icon.innerHTML = `<img src="../assets/img/buttons/btn-volume-off.svg" alt="Mute" class="mute-svg-icon" style="width:24px; height:24px;">`;
        } else {
            // Ruta al SVG de volumen activo
            icon.innerHTML = `<img src="../assets/img/buttons/btn-volume-on.svg" alt="Sound On" class="mute-svg-icon" style="width:24px; height:24px;">`;
        }
    });
}
// ESCUCHAR CLICS GLOBALES E INTERACCIONES DE AUDIO
document.addEventListener('DOMContentLoaded', () => {
    AudioManager.startLoadingAssets();
    loadInitialData();

    document.body.addEventListener('click', async (e) => {
        const target = e.target;

        // 1. SELECTORES DE INTERFAZ (Buscamos coincidencias de clics en un solo mapeo)
        const sticker     = target.closest('[data-sound]');
        const isBack      = target.closest('.back-btn');
        const isHamburger = target.closest('.hamburger-menu');
        const isUiButton  = target.closest('.more-games-btn, .menu-btn, .bio-btn, .port-btn, .blog-btn, .contact-btn, .nav-sub-menu a');

        // Si el clic no coincide con ningún elemento interactivo de audio, salimos de inmediato
        if (!sticker && !isBack && !isHamburger && !isUiButton) {
            console.log("No matching ref");
            return;
            }

        // 2. DESPERTAR EL CONTEXTO (Garantiza el hilo activo de audio en CUALQUIER interacción válida)
        if (!AudioManager.audioCtx) {
            await AudioManager.init();
        }
        if (AudioManager.audioCtx && AudioManager.audioCtx.state === 'suspended') {
            await AudioManager.audioCtx.resume();
        }

        if (sticker) {
            AudioManager.play(sticker.getAttribute('data-sound'), 0.8,true);
        } 
        else if (isBack) {
            AudioManager.play('BUTTON_BACK', 0.9, true);
        } 
        else if (isHamburger) {
            AudioManager.play('MENU_IN', 0.8, true);
        } 
        else if (isUiButton) {
            AudioManager.play('BUTTON_CLICK', 0.9, true);        
        }
    });
});
    // Cierre al hacer clic fuera del menú móvil (Hamburger custom handler)
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('mobileNavMenu');
        const hamburger = document.querySelector('.hamburger-menu');
        
        if (menu && menu.classList.contains('open')) {
            if (hamburger.contains(e.target)) return;
            
            if (e.target.tagName !== 'A') {
                menu.classList.remove('open');
                document.body.classList.remove('no-scroll');
                document.body.style.overflow = '';
                AudioManager.play('MENU_OUT');
            }
        }
    });
window.onresize = renderStickers;
