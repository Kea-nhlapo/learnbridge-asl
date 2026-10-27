param(
  [string]$ReferenceRoot = 'C:\Screenshots\SA-Educate-demo-pages-v1',
  [string]$LandingReference = 'C:\Screenshots\ChatGPT Image Oct 26, 2026, 11_50_35 PM.png',
  [string]$OutputRoot = 'C:\Screenshots\SA-Educate-demo-pages-upscaled-2x'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$files = @(
  @{ Source = $LandingReference; Name = '00-landing-reference.png' },
  @{ Source = (Join-Path $ReferenceRoot '01-educator-login.png'); Name = '01-educator-login.png' },
  @{ Source = (Join-Path $ReferenceRoot '02-dashboard-loading.png'); Name = '02-dashboard-loading.png' },
  @{ Source = (Join-Path $ReferenceRoot '03-educator-dashboard.png'); Name = '03-educator-dashboard.png' },
  @{ Source = (Join-Path $ReferenceRoot '04-lesson-library-loading.png'); Name = '04-lesson-library-loading.png' },
  @{ Source = (Join-Path $ReferenceRoot '05-lesson-plan-library.png'); Name = '05-lesson-plan-library.png' },
  @{ Source = (Join-Path $ReferenceRoot '06-create-lesson.png'); Name = '06-create-lesson.png' },
  @{ Source = (Join-Path $ReferenceRoot '07-upload-past-paper-pdf.png'); Name = '07-upload-past-paper-pdf.png' },
  @{ Source = (Join-Path $ReferenceRoot '08-generating-lesson-from-paper.png'); Name = '08-generating-lesson-from-paper.png' },
  @{ Source = (Join-Path $ReferenceRoot '09-generating-questions-from-paper.png'); Name = '09-generating-questions-from-paper.png' },
  @{ Source = (Join-Path $ReferenceRoot '10-lesson-review-loading.png'); Name = '10-lesson-review-loading.png' },
  @{ Source = (Join-Path $ReferenceRoot '11-review-generated-life-sciences-lesson.png'); Name = '11-review-generated-life-sciences-lesson.png' },
  @{ Source = (Join-Path $ReferenceRoot '12-choose-class-loading.png'); Name = '12-choose-class-loading.png' },
  @{ Source = (Join-Path $ReferenceRoot '13-choose-class-grade12.png'); Name = '13-choose-class-grade12.png' },
  @{ Source = (Join-Path $ReferenceRoot '14-assignment-success-grade12.png'); Name = '14-assignment-success-grade12.png' },
  @{ Source = (Join-Path $ReferenceRoot '14-learner-path-loading.png'); Name = '15-learner-path-loading.png' },
  @{ Source = (Join-Path $ReferenceRoot '15-learner-life-sciences-path.png'); Name = '16-learner-life-sciences-path.png' },
  @{ Source = (Join-Path $ReferenceRoot '16-question-loading.png'); Name = '17-question-loading.png' },
  @{ Source = (Join-Path $ReferenceRoot '17-question-1-astigmatism.png'); Name = '18-question-1-astigmatism.png' },
  @{ Source = (Join-Path $ReferenceRoot '18-question-2-eye-anatomy.png'); Name = '19-question-2-eye-anatomy.png' },
  @{ Source = (Join-Path $ReferenceRoot '19-question-3-insulin.png'); Name = '20-question-3-insulin.png' },
  @{ Source = (Join-Path $ReferenceRoot '20-question-4-brain.png'); Name = '21-question-4-brain.png' },
  @{ Source = (Join-Path $ReferenceRoot '21-final-question-cold-day.png'); Name = '22-final-question-cold-day.png' },
  @{ Source = (Join-Path $ReferenceRoot '22-final-answer-correct.png'); Name = '23-final-answer-correct.png' },
  @{ Source = (Join-Path $ReferenceRoot '23-explanation-loading.png'); Name = '24-explanation-loading.png' },
  @{ Source = (Join-Path $ReferenceRoot '24-final-question-explanation.png'); Name = '25-final-question-explanation.png' },
  @{ Source = (Join-Path $ReferenceRoot '25-lesson-celebration.png'); Name = '26-lesson-celebration.png' }
)

foreach ($file in $files) {
  if (-not (Test-Path -LiteralPath $file.Source)) { throw "Missing source: $($file.Source)" }
  $source = [System.Drawing.Image]::FromFile($file.Source)
  try {
    $target = [System.Drawing.Bitmap]::new($source.Width * 2, $source.Height * 2, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $target.SetResolution($source.HorizontalResolution, $source.VerticalResolution)
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $target.Width, $target.Height))
      } finally { $graphics.Dispose() }
      $target.Save((Join-Path $OutputRoot $file.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $target.Dispose() }
  } finally { $source.Dispose() }
}

$manifest = foreach ($file in $files) {
  $path = Join-Path $OutputRoot $file.Name
  $image = [System.Drawing.Image]::FromFile($path)
  try { [pscustomobject]@{ Name = $file.Name; Dimensions = "$($image.Width)x$($image.Height)"; Bytes = (Get-Item -LiteralPath $path).Length } }
  finally { $image.Dispose() }
}
$manifest | Export-Csv -NoTypeInformation -Path (Join-Path $OutputRoot 'manifest.csv')
$manifest | Format-Table -AutoSize
