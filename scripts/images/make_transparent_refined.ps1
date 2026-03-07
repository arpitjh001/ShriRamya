Add-Type -AssemblyName System.Drawing
$filePath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo.png'
$outputPath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo_transparent.png'

$bmp = New-Object System.Drawing.Bitmap($filePath)
$newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
$g = [System.Drawing.Graphics]::FromImage($newBmp)
$g.DrawImage($bmp, 0, 0)
$g.Dispose()

$targetR = 46
$targetG = 3
$targetB = 12
$tolerance = 120 # High tolerance to remove most of the maroon block

for ($x = 0; $x -lt $newBmp.Width; $x++) {
    for ($y = 0; $y -lt $newBmp.Height; $y++) {
        $pixel = $newBmp.GetPixel($x, $y)
        # Calculate distance to common dark maroon colors
        $dist = [Math]::Sqrt([Math]::Pow($pixel.R - $targetR, 2) + [Math]::Pow($pixel.G - $targetG, 2) + [Math]::Pow($pixel.B - $targetB, 2))
        
        # Also check if it's generally a very dark color (background)
        $isDark = ($pixel.R -lt 80) -and ($pixel.G -lt 60) -and ($pixel.B -lt 60)
        
        if ($dist -lt $tolerance -or $isDark) {
            # Make it transparent
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$newBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$newBmp.Dispose()
Write-Output "Refined transparent logo saved to $outputPath"
