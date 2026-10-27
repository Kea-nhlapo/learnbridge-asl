param(
  [string]$CurrentRoot = (Join-Path $PSScriptRoot 'qa\demo'),
  [string]$ReferenceRoot = 'C:\Screenshots\SA-Educate-demo-pages-4k',
  [string]$OutputRoot = (Join-Path $PSScriptRoot 'qa\comparison')
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutputRoot|Out-Null
$pairs=@(
@('00-landing.png','00-landing-reference.png'),@('01-login.png','01-educator-login.png'),@('02-dashboard-loading.png','02-dashboard-loading.png'),@('03-dashboard.png','03-educator-dashboard.png'),
@('04-library-loading.png','04-lesson-library-loading.png'),@('05-library.png','05-lesson-plan-library.png'),@('06-create.png','06-create-lesson.png'),
@('07-upload.png','07-upload-past-paper-pdf.png'),@('08-generating-lesson.png','08-generating-lesson-from-paper.png'),@('09-generating-questions.png','09-generating-questions-from-paper.png'),
@('10-review-loading.png','10-lesson-review-loading.png'),@('11-review.png','11-review-generated-life-sciences-lesson.png'),@('12-class-loading.png','12-choose-class-loading.png'),
@('13-class.png','13-choose-class-grade12.png'),@('14-assignment-success.png','14-assignment-success-grade12.png'),@('15-path-loading.png','15-learner-path-loading.png'),@('16-path.png','16-learner-life-sciences-path.png'),
@('17-question-loading.png','17-question-loading.png'),@('18-q1.png','18-question-1-astigmatism.png'),@('19-q2.png','19-question-2-eye-anatomy.png'),
@('20-q3.png','20-question-3-insulin.png'),@('21-q4.png','21-question-4-brain.png'),@('22-q5.png','22-final-question-cold-day.png'),
@('23-correct.png','23-final-answer-correct.png'),@('24-explanation-loading.png','24-explanation-loading.png'),@('25-explanation.png','25-final-question-explanation.png'),
@('26-celebration.png','26-lesson-celebration.png'))
$rows=@()
for($sheet=0;$sheet -lt [math]::Ceiling($pairs.Count/4);$sheet++){
  $canvas=[System.Drawing.Bitmap]::new(768,4*278)
  $g=[System.Drawing.Graphics]::FromImage($canvas);$g.Clear([System.Drawing.Color]::White);$g.InterpolationMode='HighQualityBicubic'
  try{
    for($r=0;$r -lt 4;$r++){
      $idx=$sheet*4+$r;if($idx -ge $pairs.Count){break};$p=$pairs[$idx]
      $cur=[System.Drawing.Bitmap]::new((Join-Path $CurrentRoot $p[0]));$ref=[System.Drawing.Bitmap]::new((Join-Path $ReferenceRoot $p[1]))
      try{$g.DrawImage($cur,0,$r*278+22,384,256);$g.DrawImage($ref,384,$r*278+22,384,256);$g.DrawString("$($idx+1) current",[System.Drawing.Font]::new('Arial',10),[System.Drawing.Brushes]::Black,4,$r*278+3);$g.DrawString('reference',[System.Drawing.Font]::new('Arial',10),[System.Drawing.Brushes]::Black,388,$r*278+3)
        $a=[System.Drawing.Bitmap]::new($cur,64,43);$b=[System.Drawing.Bitmap]::new($ref,64,43);$sum=0
        for($y=0;$y -lt 43;$y++){for($x=0;$x -lt 64;$x++){$ca=$a.GetPixel($x,$y);$cb=$b.GetPixel($x,$y);$sum += [math]::Abs($ca.R-$cb.R)+[math]::Abs($ca.G-$cb.G)+[math]::Abs($ca.B-$cb.B)}}
        $score=[math]::Round(100*$sum/(64*43*765),1);$rows += [pscustomobject]@{Screen=$p[0];DifferencePercent=$score};$a.Dispose();$b.Dispose()
      }finally{$cur.Dispose();$ref.Dispose()}
    }
    $canvas.Save((Join-Path $OutputRoot ('sheet-{0:d2}.png'-f($sheet+1))),[System.Drawing.Imaging.ImageFormat]::Png)
  }finally{$g.Dispose();$canvas.Dispose()}
}
$rows|Sort-Object DifferencePercent -Descending|Format-Table -AutoSize
