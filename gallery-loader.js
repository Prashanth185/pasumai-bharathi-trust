document.addEventListener("DOMContentLoaded", async () => {
    const API_BASE_URL = "https://pasumai-bharathi-trust.onrender.com";

    // Dynamically load images if running on Live Server
    try {
      const response = await fetch(`${API_BASE_URL}/images/`);
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'))
                           .map(a => a.getAttribute('href'))
                           .filter(href => href && !href.startsWith('?'));
                           
        const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const images = links.filter(link => {
            const lower = link.toLowerCase();
            return imgExts.some(ext => lower.endsWith(ext)) && !lower.includes('cover');
        });
        
        const galleryGrid = document.querySelector('.gallery-grid');
        if (galleryGrid) {
            galleryGrid.innerHTML = ''; // Clear hardcoded images
            if (images.length > 0) {
                images.forEach(img => {
                    const cleanUrl = decodeURIComponent(img.split('/').pop());
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.innerHTML = `<img src="${API_BASE_URL}/images/${cleanUrl}" alt="${cleanUrl}" onerror="this.style.display='none'"><div class="gallery-caption">${cleanUrl}</div>`;
                    galleryGrid.appendChild(item);
                });
            } else {
                galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No photos uploaded yet.</p>';
            }
        }
      }
    } catch (e) {
      console.log("Auto-load images skipped (not supported in this environment)");
    }

    // Dynamically load videos
    try {
      const response = await fetch(`${API_BASE_URL}/videos/`);
      if (response.ok) {
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'))
                           .map(a => a.getAttribute('href'))
                           .filter(href => href && !href.startsWith('?'));
                           
        const vidExts = ['.mp4', '.webm', '.ogg', '.mov'];
        const videos = links.filter(link => {
            const lower = link.toLowerCase();
            return vidExts.some(ext => lower.endsWith(ext));
        });
        
        const videoGrid = document.querySelector('.video-grid') || document.querySelector('.video-box');
        if (videoGrid) {
            videoGrid.innerHTML = ''; // Clear hardcoded videos
            videoGrid.className = 'video-grid'; // Force it to grid to support multiple videos elegantly
            if (videos.length > 0) {
                videos.forEach(vid => {
                    const cleanUrl = decodeURIComponent(vid.split('/').pop());
                    const item = document.createElement('div');
                    item.className = 'video-card';
                    item.innerHTML = `<video controls preload="metadata"><source src="${API_BASE_URL}/videos/${cleanUrl}"></video><div class="gallery-caption">${cleanUrl}</div>`;
                    videoGrid.appendChild(item);
                });
            } else {
                videoGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No videos uploaded yet.</p>';
            }
        }
      }
    } catch (e) {
      console.log("Auto-load videos skipped (not supported in this environment)");
    }
});
