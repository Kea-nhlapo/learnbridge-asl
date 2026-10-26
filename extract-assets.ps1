Add-Type -AssemblyName System.Drawing

$reference = 'C:\Screenshots\landing-page-images\sections'
$output = 'C:\Screenshots\sites\sa-educate-landing\public\assets'
New-Item -ItemType Directory -Path $output -Force | Out-Null

$assets = @(
    @{ Source='01-hero.png'; Name='hero-educator.png'; X=890; Y=76; W=950; H=548 },
    @{ Source='03-how-it-works.png'; Name='step-upload.png'; X=250; Y=245; W=310; H=175 },
    @{ Source='03-how-it-works.png'; Name='step-review.png'; X=810; Y=245; W=280; H=175 },
    @{ Source='03-how-it-works.png'; Name='step-assign.png'; X=1320; Y=245; W=340; H=175 },
    @{ Source='04-educator-dashboard.png'; Name='dashboard-preview.png'; X=740; Y=35; W=1070; H=610 },
    @{ Source='05-accessibility-swapped.png'; Name='accessibility-preview.png'; X=73; Y=68; W=1150; H=690 },
    @{ Source='06-learner-progress.png'; Name='progress-preview.png'; X=731; Y=23; W=1069; H=424 },
    @{ Source='02-public-sector-carousel.png'; Name='logo-egov.png'; X=142; Y=49; W=328; H=125 },
    @{ Source='02-public-sector-carousel.png'; Name='logo-dbe.png'; X=526; Y=50; W=285; H=122 },
    @{ Source='02-public-sector-carousel.png'; Name='logo-dhet.png'; X=870; Y=49; W=287; H=123 },
    @{ Source='02-public-sector-carousel.png'; Name='logo-sita.png'; X=1248; Y=40; W=150; H=145 },
    @{ Source='02-public-sector-carousel.png'; Name='logo-nsfas.png'; X=1521; Y=47; W=180; H=135 }
)

foreach ($asset in $assets) {
    $src = [System.Drawing.Bitmap]::FromFile((Join-Path $reference $asset.Source))
    try {
        $rect = New-Object System.Drawing.Rectangle($asset.X,$asset.Y,$asset.W,$asset.H)
        $crop = $src.Clone($rect,$src.PixelFormat)
        try { $crop.Save((Join-Path $output $asset.Name),[System.Drawing.Imaging.ImageFormat]::Png) }
        finally { $crop.Dispose() }
    }
    finally { $src.Dispose() }
}
