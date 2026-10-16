Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
$script:asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await-Operation($operation, $resultType) { $task=$script:asTask.MakeGenericMethod($resultType).Invoke($null,@($operation)); $task.Wait(); $task.Result }
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
Get-ChildItem output/reports/reading-scenario-kits-2026-10-16/*-*.png | ForEach-Object {
 $f=Await-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($_.FullName)) ([Windows.Storage.StorageFile])
 $stream=Await-Operation ($f.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
 $decoder=Await-Operation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $bitmap=Await-Operation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
 $result=Await-Operation ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
 $result.Lines | ForEach-Object { [pscustomobject]@{text=$_.Text;x=$_.Words[0].BoundingRect.X;y=$_.Words[0].BoundingRect.Y} } | ConvertTo-Json | Set-Content ($_.FullName+'.ocr.json') -Encoding utf8
 $result.Lines.Text | Set-Content ($_.FullName+'.ocr.txt') -Encoding utf8
 $stream.Dispose();$bitmap.Dispose()
}
