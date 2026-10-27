param(
  [string]$SourceRoot = 'C:\Screenshots',
  [string]$OutputRoot = (Join-Path $PSScriptRoot 'public\assets\demo')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$crops = @(
  @{ Source = 'SA-Educate-paper-MCQ-27.png'; Target = 'q1-astigmatism.png'; X = 240; Y = 165; W = 1050; H = 300; OutW = 2100 },
  @{ Source = 'SA-Educate-paper-MCQ-28.png'; Target = 'q2-eye-anatomy.png'; X = 330; Y = 160; W = 850; H = 400; OutW = 1700 },
  @{ Source = 'SA-Educate-paper-MCQ-29.png'; Target = 'q3-insulin-graph.png'; X = 250; Y = 155; W = 1080; H = 420; OutW = 2160 },
  @{ SourcePath = 'C:\Users\User\AppData\Local\Temp\codex-clipboard-675e559c-17ac-4318-88d6-4a5defc87994.png'; Target = 'q4-brain.png'; X = 560; Y = 338; W = 225; H = 105; OutW = 1350 },
  @{ Source = 'SA-Educate-paper-MCQ-31.png'; Target = 'q5-cold-day.png'; X = 245; Y = 150; W = 1060; H = 335; OutW = 2120 },
  @{ Source = 'SA-Educate-demo-pages-v1\24-final-question-explanation.png'; Target = 'sign-language-presenter.png'; X = 735; Y = 230; W = 310; H = 435; OutW = 930 },
  @{ Source = 'SA-Educate-demo-pages-v1\25-lesson-celebration.png'; Target = 'completion-medal.png'; X = 430; Y = 85; W = 420; H = 260; OutW = 1260 },
  @{ Source = 'SA-Educate-demo-pages-v1\15-learner-life-sciences-path.png'; Target = 'path-life-sciences.png'; X = 390; Y = 340; W = 395; H = 430; OutW = 1185 }
)

foreach ($crop in $crops) {
  $sourcePath = if ($crop.SourcePath) { $crop.SourcePath } else { Join-Path $SourceRoot $crop.Source }
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing source image: $sourcePath"
  }

  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $outHeight = [int][math]::Round($crop.H * ($crop.OutW / $crop.W))
    $bitmap = [System.Drawing.Bitmap]::new($crop.OutW, $outHeight)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $destination = [System.Drawing.Rectangle]::new(0, 0, $crop.OutW, $outHeight)
        $sourceRect = [System.Drawing.Rectangle]::new($crop.X, $crop.Y, $crop.W, $crop.H)
        $graphics.DrawImage($source, $destination, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $graphics.Dispose()
      }
      $targetPath = Join-Path $OutputRoot $crop.Target
      $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

Get-ChildItem -LiteralPath $OutputRoot -Filter '*.png' |
  Sort-Object Name |
  Select-Object Name, Length
