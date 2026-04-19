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