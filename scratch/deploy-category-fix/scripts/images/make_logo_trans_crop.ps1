Add-Type -AssemblyName System.Drawing
$filePath = 'C:\Users\Lenovo\.gemini\antigravity\brain\abba56a4-885e-497c-9031-3249566d321b\shriramya_logo_white_bg_1772043261808.png'
$outputPath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo.png'

$bmp = New-Object System.Drawing.Bitmap($filePath)
$newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

# Threshold for isolating the subject (gold and maroon) from white/gray background
for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        
        # Gold: High R, High G, lower B. 
        # Maroon: Medium R, Very Low G/B.
        # Background: R, G, B all high (white/light gray)
        
        $isBackground = ($pixel.R -gt 230 -and $pixel.G -gt 230 -and $pixel.B -gt 230)
        
        if ($isBackground) {
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
        else {
            $newBmp.SetPixel($x, $y, $pixel)
        }
    }
}

# Auto-crop the new bitmap to the non-transparent bounds
$top = $newBmp.Height
$bottom = 0
$left = $newBmp.Width
$right = 0

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

# Add 10px padding
$left = [Math]::Max(0, $left - 10)
$top = [Math]::Max(0, $top - 10)
$right = [Math]::Min($newBmp.Width - 1, $right + 10)
$bottom = [Math]::Min($newBmp.Height - 1, $bottom + 10)

$cropWidth = $right - $left
$cropHeight = $bottom - $top

$croppedBmp = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight)
$g = [System.Drawing.Graphics]::FromImage($croppedBmp)
$g.DrawImage($newBmp, [System.Drawing.Rectangle]::new(0, 0, $cropWidth, $cropHeight), [System.Drawing.Rectangle]::new($left, $top, $cropWidth, $cropHeight), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$croppedBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$bmp.Dispose()
$newBmp.Dispose()
$croppedBmp.Dispose()
Write-Output "Auto-cropped high-quality transparent logo saved to $outputPath"
