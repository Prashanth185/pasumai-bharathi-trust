$events = @(
    'programs/social-welfare/diwali-celebration-2024',
    'programs/environmental-conservation/tree-sapling-distribution',
    'programs/environmental-conservation/seed-ball-preparation',
    'programs/environmental-conservation/environmental-awareness-program'
)

foreach ($event in $events) {
    $indexPath = "$event/index.html"
    if (!(Test-Path $indexPath)) { continue }
    
    $content = [System.IO.File]::ReadAllText($indexPath)
    
    # 1. Images
    $imagesDir = "$event/images"
    $imageHtml = ""
    if (Test-Path $imagesDir) {
        $imgFiles = Get-ChildItem -Path $imagesDir -File | Where-Object { $_.Name -notmatch "cover\.(jpg|jpeg|png|webp|gif)$ " -and $_.Extension -match "\.(jpg|jpeg|png|gif|webp)$ " }
        if ($imgFiles.Count -gt 0) {
            foreach ($img in $imgFiles) {
                $name = $img.Name
                $imageHtml += "<div class=`"gallery-item`"><img src=`"images/$name`" alt=`"$name`"><div class=`"gallery-caption`">$name</div></div>
      "
            }
        } else {
            $imageHtml = "<p style=`"grid-column: 1/-1; text-align: center; color: #666;`">No photos uploaded yet.</p>"
        }
    }
    
    # 2. Videos
    $videosDir = "$event/videos"
    $videoHtml = ""
    if (Test-Path $videosDir) {
        $vidFiles = Get-ChildItem -Path $videosDir -File | Where-Object { $_.Extension -match "\.(mp4|webm|ogg|mov)$ " }
        if ($vidFiles.Count -gt 0) {
            foreach ($vid in $vidFiles) {
                $name = $vid.Name
                $videoHtml += "<div class=`"video-card`"><video controls preload=`"metadata`"><source src=`"videos/$name`"></video><div class=`"gallery-caption`">$name</div></div>
      "
            }
        } else {
            $videoHtml = "<p style=`"grid-column: 1/-1; text-align: center; color: #666;`">No videos uploaded yet.</p>"
        }
    }
    
    # Replace gallery-grid
    $content = $content -replace '(?s)(<div class="gallery-grid">).*?(</section>)', ("$1
      " + $imageHtml + "
    </div>
  $2")
    
    # Replace video-grid
    $content = $content -replace '(?s)(<div class="video-grid">).*?(</section>)', ("$1
      " + $videoHtml + "
    </div>
  $2")
    
    # Remove gallery-loader script
    $content = $content -replace '(?s)<script[^>]*gallery-loader\.js[^>]*></script>', ''
    
    [System.IO.File]::WriteAllText($indexPath, $content)
}

# Create the ZIP file
$source = "."
$destination = "..\pasumai-bharathi-trust-website.zip"
if (Test-Path $destination) { Remove-Item $destination }
Compress-Archive -Path $source\* -DestinationPath $destination
Write-Output "Success"
