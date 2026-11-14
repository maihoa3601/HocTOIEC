param([Parameter(Mandatory=$true)][string]$Directory,[string]$Pattern='*.png')
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
foreach($image in Get-ChildItem -LiteralPath $Directory -Filter $Pattern) {
    $file=Wait-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($image.FullName)) ([Windows.Storage.StorageFile])
    $stream=Wait-WinRT ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    try {
        $decoder=Wait-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap=Wait-WinRT ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        try {
            $result=Wait-WinRT ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
            $lines=@($result.Lines | ForEach-Object {$_.Text})
            [IO.File]::WriteAllLines(($image.FullName+'.txt'),$lines,[Text.Encoding]::UTF8)
            Write-Output ($image.Name+': '+$lines.Count+' lines; review required')
        } finally {$bitmap.Dispose()}
    } finally {$stream.Dispose()}
}
