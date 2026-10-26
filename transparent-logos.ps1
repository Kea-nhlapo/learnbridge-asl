Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$folder = 'C:\Screenshots\sites\sa-educate-landing\public\assets'
@('logo-egov.png','logo-dbe.png','logo-dhet.png','logo-sita.png','logo-nsfas.png') | ForEach-Object {
    $file = Join-Path $folder $_
    $source = [System.Drawing.Bitmap]::FromFile($file)
    $result = [System.Drawing.Bitmap]::new($source.Width,$source.Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        for ($y=0; $y -lt $source.Height; $y++) {
            for ($x=0; $x -lt $source.Width; $x++) {
                $pixel = $source.GetPixel($x,$y)
                if ($pixel.R -ge 195 -and $pixel.G -ge 205 -and $pixel.B -ge 215) {
                    $result.SetPixel($x,$y,[System.Drawing.Color]::Transparent)
                } else {
                    $result.SetPixel($x,$y,$pixel)
                }
            }
        }
        $source.Dispose()
        $result.Save($file,[System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally { $result.Dispose(); if ($source) { $source.Dispose() } }
}
