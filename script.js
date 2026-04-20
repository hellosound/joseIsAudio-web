function showPage(sectionId) {
        document.querySelectorAll('.content-page').forEach(page=> {
          page.classList.remove('active');
        });

        const target = document.getElementById(sectionId);
        if(target){
          target.classList.add('active');
        }
        closeGameDetails();
      }
      
      function openGameDetails(title, videoUrl) {
          const overlay = document.getElementById('game-overlay');
          document.getElementById('game-title').innerText = title;
          document.getElementById('game-video').src = videoUrl;
          overlay.classList.add('active');
      }

      function closeGameDetails() {
          const overlay = document.getElementById('game-overlay');
          overlay.classList.remove('active'); 
          setTimeout(() => {
              document.getElementById('game-video').src = "";
          }, 600);
        }

      async function loadBlogPosts() {
        const blogContainer = document.getElementById('blog-list');
        if(!blogList) return;
        
        try {
            const response = await fetch('posts.json');
            const posts = await response.json();

            blogContainer.innerHTML = posts.map(post => `
                <article class="blog-card">
                    <a href="${post.link}" class="blog-link">
                        <span class="blog-date">${post.date}</span>
                        <h3>${post.title}</h3>
                        <p>${post.description}</p>
                    </a>
                </article>
            `).join('');
            
        } catch (error) {
            console.error("Error cargando el blog:", error);
            blogContainer.innerHTML = "<p>Coming soon...</p>";
        }
    }

    // Llama a la función cuando se cargue la página
    document.addEventListener('DOMContentLoaded', loadBlogPosts);