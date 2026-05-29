document.addEventListener("DOMContentLoaded", async () => {
    const API_BASE_URL = "https://pasumai-bharathi-trust.onrender.com";

    try {
        const response = await fetch(`${API_BASE_URL}/images/what-we-do/`);
        if (response.ok) {
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");
            const links = Array.from(doc.querySelectorAll("a"))
                               .map(a => a.getAttribute("href"))
                               .filter(href => href && !href.startsWith("?"));
                               
            const imgExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
            const images = links.filter(link => {
                const lower = link.toLowerCase();
                return imgExts.some(ext => lower.endsWith(ext));
            });
            
            const grid = document.getElementById("whatWeDoGrid");
            if (grid && images.length > 0) {
                grid.innerHTML = "";
                images.forEach(img => {
                    const cleanUrl = decodeURIComponent(img.split("/").pop());
                    const nameWithoutExt = cleanUrl.substring(0, cleanUrl.lastIndexOf("."));
                    const title = nameWithoutExt;
                    
                    const item = document.createElement("div");
                    item.className = "info-card";
                    item.innerHTML = `<img src="${API_BASE_URL}/images/what-we-do/${cleanUrl}" class="card-image" alt="${title}">
                                      <h3>${title}</h3>`;
                    grid.appendChild(item);
                });
            }
        }
    } catch (e) {
        console.log("Auto-load skipped for What We Do");
    }
});
