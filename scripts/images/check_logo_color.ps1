Add-Type -AssemblyName System.Drawing
$filePath = 'c:\Users\Lenovo\shriramya\ShriRamya\frontend\public\logo.png'
$bmp = New-Object System.Drawing.Bitmap($filePath)
$pixel = $bmp.GetPixel(0,0)
Write-Output "Color: $($pixel.R), $($pixel.G), $($pixel.B)"
$bmp.Dispose()
