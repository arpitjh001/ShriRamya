Add-Type -AssemblyName System.Drawing
$filePath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo.png'
$outputPath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo_transparent.png'

$bmp = New-Object System.Drawing.Bitmap($filePath)
$newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        
        # Determine if the pixel is part of the gold logo
        # Gold usually has high R and G, and G is close to R. B is lower.
        $isGold = ($pixel.R -gt 100) -and ($pixel.G -gt 80)
        
        if ($isGold) {
            # Keep the gold pixel (and maybe clean it up a bit if it has maroon tint)
            $newBmp.SetPixel($x, $y, $pixel)
        }
        else {
            # Make it transparent
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$newBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$newBmp.Dispose()
Write-Output "Gold-isolated transparent logo saved to $outputPath"
