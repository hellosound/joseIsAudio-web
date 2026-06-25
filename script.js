let allGames = [];

function showPage(sectionId) {
    closeGameDetails();
    
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });

    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        target.scrollTop = 0;
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
            width = '105px'; 
            height = '105px';
            leftPos = "50%";
            topPos = "85%";
            transformBase = `translate(-50%, -50%) rotate(${rotation}deg)`;
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
        if(game.id === 'OMD') labelColor = '#f1b83a'; 
        if(game.id === 'TMNT') labelColor = '#f1b83a';
        if(game.id === 'KKFOS') labelColor = '#00b4eb'; 
        if(game.id === 'ALUMBRA') labelColor = '#00b4eb';

        return `
            <div class="sticker ${'game-' + (index + 1)}" 
                 onclick="openGameDetails('${game.id}')" 
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
                <span class="read-more-tag">Read More</span>
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
    const game = allGames.find(g => g.id === gameId);
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

    document.getElementById('game-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
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

document.addEventListener('DOMContentLoaded', loadInitialData);
window.onresize = renderStickers;