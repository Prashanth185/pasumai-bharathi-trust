const fs = require('fs');
const path = require('path');

const events = [
    'programs/social-welfare/diwali-celebration-2024',
    'programs/environmental-conservation/tree-sapling-distribution',
    'programs/environmental-conservation/seed-ball-preparation',
    'programs/environmental-conservation/environmental-awareness-program'
];

for (const event of events) {
    const indexPath = path.join(event, 'index.html');
    if (!fs.existsSync(indexPath)) continue;
    
    let content = fs.readFileSync(indexPath, 'utf-8');
    
    const imagesDir = path.join(event, 'images');
    let imageHtml = '';
    if (fs.existsSync(imagesDir)) {
        const files = fs.readdirSync(imagesDir).filter(f => !/^cover\.(jpg|jpeg|png|gif|webp)$/i.test(f) && /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
        if (files.length > 0) {
            imageHtml = files.map(f => '      <div class="gallery-item"><img src="images/' + f + '" alt="' + f + '"><div class="gallery-caption">' + f + '</div></div>').join('\n');
        } else {
            imageHtml = '      <p style="grid-column: 1/-1; text-align: center; color: #666;">No photos uploaded yet.</p>';
        }
    }
    
    const gallerySection = '  <!-- SECTION 2: Photo Gallery -->\n  <section class="gallery-section section-card">\n    <div class="section-title"><h2>Photos</h2></div>\n    <div class="gallery-grid">\n' + imageHtml + '\n    </div>\n  </section>';

    const videosDir = path.join(event, 'videos');
    let videoHtml = '';
    if (fs.existsSync(videosDir)) {
        const files = fs.readdirSync(videosDir).filter(f => /\.(mp4|webm|ogg|mov)$/i.test(f));
        if (files.length > 0) {
            videoHtml = files.map(f => '      <div class="video-card"><video controls preload="metadata"><source src="videos/' + f + '"></video><div class="gallery-caption">' + f + '</div></div>').join('\n');
        } else {
            videoHtml = '      <p style="grid-column: 1/-1; text-align: center; color: #666;">No videos uploaded yet.</p>';
        }
    }
    
    const videoSection = '  <!-- SECTION 3: Video Gallery -->\n  <section class="video-section section-card">\n    <div class="section-title"><h2>Video Gallery</h2></div>\n    <div class="video-grid">\n' + videoHtml + '\n    </div>\n  </section>';

    const replaceRegex = /<section class="gallery-section section-card">[\s\S]*?(?=<\/main>)/;
    
    if (replaceRegex.test(content)) {
        content = content.replace(replaceRegex, gallerySection + '\n\n' + videoSection + '\n\n  ');
    } else {
        content = content.replace(/<\/main>/, '\n' + gallerySection + '\n\n' + videoSection + '\n\n</main>');
    }
    
    content = content.replace(/<script[^>]*gallery-loader\.js[^>]*><\/script>/gi, '');

    fs.writeFileSync(indexPath, content, 'utf-8');
}
console.log('Fixed');
