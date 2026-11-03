# Export the browser and iPhone icons from the shared 512x512 master.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$directory = Join-Path $PSScriptRoot '..\frontend\public'
$source = [System.Drawing.Image]::FromFile((Join-Path $directory 'icon-512.png'))

try {
    if ($source.Width -ne 512 -or $source.Height -ne 512) {
        throw 'icon-512.png must be 512x512 pixels.'
    }

    foreach ($icon in @(@{ Size = 180; Name = 'apple-touch-icon.png' }, @{ Size = 192; Name = 'icon-192.png' })) {
        $bitmap = New-Object System.Drawing.Bitmap($icon.Size, $icon.Size)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.InterpolationMode = 'HighQualityBicubic'
                $graphics.DrawImage($source, 0, 0, $icon.Size, $icon.Size)
                $bitmap.Save((Join-Path $directory $icon.Name), [System.Drawing.Imaging.ImageFormat]::Png)
            } finally {
                $graphics.Dispose()
            }
        } finally {
            $bitmap.Dispose()
        }
    }
} finally {
    $source.Dispose()
}
