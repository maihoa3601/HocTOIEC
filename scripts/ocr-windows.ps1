param(
  [Parameter(Mandatory=$true)][string]$Directory,
  [string]$Pattern='*.png',
  [switch]$Json,
  [string]$OutJson=''
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrResult,Windows.Foundation,ContentType=WindowsRuntime]
$awaitMethod=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1} | Select-Object -First 1
function Wait-WinRT($Operation,[type]$ResultType) {
    $task=$awaitMethod.MakeGenericMethod($ResultType).Invoke($null,@($Operation))
    $task.Wait()
    return $task.Result
}
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language 'en-US'))
if ($null -eq $engine) {throw 'English OCR language pack is unavailable.'}
$jsonPages = New-Object System.Collections.ArrayList
foreach($image in (Get-ChildItem -LiteralPath $Directory -Filter $Pattern | Sort-Object Name)) {
    $file=Wait-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($image.FullName)) ([Windows.Storage.StorageFile])
    $stream=Wait-WinRT ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    try {
        $decoder=Wait-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap=Wait-WinRT ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        try {
            $result=Wait-WinRT ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
            if ($Json) {
                $words = New-Object System.Collections.ArrayList
                foreach ($line in $result.Lines) {
                    foreach ($w in $line.Words) {
                        $r = $w.BoundingRect
                        [void]$words.Add(@{ t=$w.Text; x=[int]$r.X; y=[int]$r.Y; w=[int]$r.Width; h=[int]$r.Height })
                    }
                }
                [void]$jsonPages.Add(@{
                    file=$image.Name
                    width=$bitmap.PixelWidth
                    height=$bitmap.PixelHeight
                    words=$words
                })
            } else {
                $lines=@($result.Lines | ForEach-Object {$_.Text})
                [IO.File]::WriteAllLines(($image.FullName+'.txt'),$lines,[Text.Encoding]::UTF8)
                Write-Output ($image.Name+': '+$lines.Count+' lines; review required')
            }
        } finally {$bitmap.Dispose()}
    } finally {$stream.Dispose()}
}
if ($Json) {
    $payload = ConvertTo-Json -InputObject @($jsonPages) -Depth 5 -Compress
    if ($OutJson) {
        [IO.File]::WriteAllText($OutJson, $payload, [Text.Encoding]::UTF8)
    } else {
        Write-Output $payload
    }
}
