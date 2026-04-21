Add-Type -AssemblyName System.Drawing
$filePath = 'C:\Users\Lenovo\.gemini\antigravity\brain\abba56a4-885e-497c-9031-3249566d321b\shriramya_logo_white_bg_1772043261808.png'
$outputPath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo.png'

$bmp = New-Object System.Drawing.Bitmap($filePath)
# Make white transparent
$bmp.MakeTransparent([System.Drawing.Color]::White)
# Also target near-white for smoother edges
for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.R -gt 245 -and $pixel.G -gt 245 -and $pixel.B -gt 245) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "High-quality transparent logo saved to $outputPath"
