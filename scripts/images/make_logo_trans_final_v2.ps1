Add-Type -AssemblyName System.Drawing
$filePath = 'C:\Users\Lenovo\.gemini\antigravity\brain\abba56a4-885e-497c-9031-3249566d321b\shriramya_logo_white_bg_1772043261808.png'
$outputPath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo.png'

$bmp = New-Object System.Drawing.Bitmap($filePath)
$newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        
        # Calculate saturation or distance from grayscale
        $max = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
        $min = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
        $chroma = $max - $min
        
        # Background is close to grayscale (white/gray/black)
        # Gold and Maroon have high chroma
        
        if ($chroma -lt 30 -and $max -gt 150) {
            # This is definitely background (white/light gray)
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
        elseif ($max -gt 240 -and $chroma -lt 10) {
            # White
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
        else {
            $newBmp.SetPixel($x, $y, $pixel)
        }
    }
}

# Auto-crop logic...
$top = $newBmp.Height; $bottom = 0; $left = $newBmp.Width; $right = 0
for ($x = 0; $x -lt $newBmp.Width; $x++) {
    for ($y = 0; $y -lt $newBmp.Height; $y++) {
        if ($newBmp.GetPixel($x, $y).A -gt 0) {
            if ($x -lt $left) { $left = $x }
            if ($x -gt $right) { $right = $x }
            if ($y -lt $top) { $top = $y }
            if ($y -gt $bottom) { $bottom = $y }
        }
    }
}
$left = [Math]::Max(0, $left - 5); $top = [Math]::Max(0, $top - 5); $right = [Math]::Min($newBmp.Width - 1, $right + 5); $bottom = [Math]::Min($newBmp.Height - 1, $bottom + 5)
$cropWidth = $right - $left; $cropHeight = $bottom - $top
$croppedBmp = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight)
$g = [System.Drawing.Graphics]::FromImage($croppedBmp)
$g.DrawImage($newBmp, [System.Drawing.Rectangle]::new(0, 0, $cropWidth, $cropHeight), [System.Drawing.Rectangle]::new($left, $top, $cropWidth, $cropHeight), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$croppedBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $newBmp.Dispose(); $croppedBmp.Dispose()
Write-Output "Fixed transparent logo saved."
