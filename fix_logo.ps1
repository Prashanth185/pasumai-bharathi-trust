$baseDir = "c:\Users\LAKSHMI_R\Downloads\pasumai-bharathi-trust\pasumai-bharathi-trust"
Get-ChildItem -Path $baseDir -Filter *.html -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Check if the file contains the old logo
    if ($content -match '🌿 PASUMAI TRUST') {
        # Calculate depth
        $relativePath = $_.FullName.Substring($baseDir.Length).TrimStart('\')
        $depth = ($relativePath -split '\\').Count - 1
        
        $prefix = ""
        for ($i=0; $i -lt $depth; $i++) { $prefix += "../" }
        $logoPath = $prefix + "images/logo.png"
        
        # Replace the multi-line and single-line versions
        $content = $content -replace '<div class="logo">\s*🌿 PASUMAI TRUST\s*</div>', "<div class=`"logo`">`n        <img src=`"$logoPath`" alt=`"Pasumai Trust Logo`">`n      </div>"
        
        Set-Content -Path $_.FullName -Value $content
        Write-Host "Updated $($_.FullName)"
    }
}
