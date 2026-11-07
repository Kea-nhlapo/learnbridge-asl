param(
  [string]$ImageRoot = 'C:\Screenshots\SA-Educate-demo-pages-upscaled-2x'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outputRoot = Join-Path $ImageRoot 'contact-sheets'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$images = @(Get-ChildItem -LiteralPath $ImageRoot -Filter '*.png' -File | Sort-Object Name)
$columns = 3
$rows = 3
$pageSize = $columns * $rows
$thumbWidth = 512
$thumbHeight = 341
$labelHeight = 48
$margin = 24
$canvasWidth = ($columns * $thumbWidth) + (($columns + 1) * $margin)
$canvasHeight = ($rows * ($thumbHeight + $labelHeight)) + (($rows + 1) * $margin)

$font = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 48, 82))
$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(190, 216, 235), 2)

try {
  for ($page = 0; $page -lt [Math]::Ceiling($images.Count / $pageSize); $page++) {
    $canvas = New-Object System.Drawing.Bitmap $canvasWidth, $canvasHeight
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        for ($slot = 0; $slot -lt $pageSize; $slot++) {
          $index = ($page * $pageSize) + $slot
          if ($index -ge $images.Count) { break }

          $column = $slot % $columns
          $row = [Math]::Floor($slot / $columns)
          $x = $margin + ($column * ($thumbWidth + $margin))
          $y = $margin + ($row * ($thumbHeight + $labelHeight + $margin))
          $source = [System.Drawing.Image]::FromFile($images[$index].FullName)
          try {
            $graphics.DrawImage($source, $x, $y, $thumbWidth, $thumbHeight)
            $graphics.DrawRectangle($borderPen, $x, $y, $thumbWidth, $thumbHeight)
          } finally {
            $source.Dispose()
          }

          $label = $images[$index].BaseName
          $graphics.DrawString($label, $font, $textBrush, $x, ($y + $thumbHeight + 8))
        }
      } finally {
        $graphics.Dispose()
      }

      $outputPath = Join-Path $outputRoot ('contact-sheet-{0:D2}.png' -f ($page + 1))
      $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $canvas.Dispose()
    }
  }
} finally {
  $font.Dispose()
  $textBrush.Dispose()
  $borderPen.Dispose()
}

Get-ChildItem -LiteralPath $outputRoot -Filter '*.png' -File | Sort-Object Name |
  Select-Object Name, Length, FullName | Format-Table -AutoSize
