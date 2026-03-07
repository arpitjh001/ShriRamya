Add-Type -AssemblyName System.Drawing
$filePath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo.png'
$outputPath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo_transparent.png'

$bmp = New-Object System.Drawing.Bitmap($filePath)
$bgColor = $bmp.GetPixel(0,0)
$bmp.MakeTransparent($bgColor)
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "Transparent logo saved to $outputPath"
