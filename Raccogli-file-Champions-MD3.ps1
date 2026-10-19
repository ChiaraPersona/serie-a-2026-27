$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$out = Join-Path $env:USERPROFILE 'Desktop\Champions-MD3-Mancanti'
$zip = Join-Path $env:USERPROFILE 'Desktop\Champions-MD3-Mancanti.zip'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$paths = @(
  'data/analysis/champions/md3-callups-cl3-2026-10-19/dortmund.html',
  'data/analysis/champions/md3-callups-cl3-2026-10-19/barcelona.html',
  'data/analysis/champions/md3-callups-cl3-2026-10-19/atletico.html'
)
# Recupera tutti gli HTML della directory originale (nomi reali anche diversi da quelli ipotizzati).
$rawFolder = Join-Path $root 'data/analysis/champions/md3-callups-cl3-2026-10-19'
if (Test-Path $rawFolder) {
  Get-ChildItem $rawFolder -File -Filter '*.html' | ForEach-Object {
    $relative = 'data/analysis/champions/md3-callups-cl3-2026-10-19/' + $_.Name
    $target = Join-Path $out ($relative -replace '/', '\')
    New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
    Copy-Item $_.FullName $target -Force
  }
}
# Cerca gli script che producono l'output, senza copiare l'intero repository.
$scriptsDir = Join-Path $root 'scripts'
$matches = @()
if (Test-Path $scriptsDir) {
  $matches = @(Get-ChildItem $scriptsDir -Recurse -File -Include '*.js','*.mjs','*.cjs' | Where-Object {
    Select-String -Path $_.FullName -Pattern 'champions-md03-probable-individuals-2026-27.json' -SimpleMatch -Quiet
  })
  foreach ($file in $matches) {
    $relative = $file.FullName.Substring($root.Length).TrimStart('\','/')
    $target = Join-Path $out $relative
    New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
    Copy-Item $file.FullName $target -Force
  }
}
$manifest = @('Directory progetto: ' + $root, 'Script generatori trovati: ' + $matches.Count)
$manifest += $matches | ForEach-Object { $_.FullName }
$manifest += 'File HTML recuperati:'
$manifest += Get-ChildItem $out -Recurse -File -Filter '*.html' | ForEach-Object { $_.FullName }
$manifest | Set-Content -Path (Join-Path $out 'MANIFEST.txt') -Encoding UTF8
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $out '*') -DestinationPath $zip -Force
Write-Host "Archivio pronto: $zip"
Write-Host "Script generatori trovati: $($matches.Count)"
