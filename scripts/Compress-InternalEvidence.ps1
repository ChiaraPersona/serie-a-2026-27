param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class EvidenceDiskSize {
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
 public static extern uint GetCompressedFileSizeW(string name, out uint high);
 public static ulong Size(string name) { uint high; uint low=GetCompressedFileSizeW(name,out high); if(low==uint.MaxValue && Marshal.GetLastWin32Error()!=0) throw new System.ComponentModel.Win32Exception(); return ((ulong)high<<32)|low; }
}
"@
$taskFiles = @(
 Get-ChildItem -LiteralPath (Join-Path $taskRoot 'reports') -Recurse -File -Filter '*.json'
 Get-ChildItem -LiteralPath (Join-Path $taskRoot 'output') -Recurse -File -Filter '*.json.before'
 Get-ChildItem -LiteralPath (Join-Path $taskRoot 'tmp') -Recurse -File -Filter '*.html'
) | Where-Object { -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) }
$taskRecords = @($taskFiles | ForEach-Object {
 $taskPath = [IO.Path]::GetFullPath($_.FullName)
 if (-not $taskPath.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Outside workspace' }
 [pscustomobject]@{file=$taskPath.Substring($taskRoot.Length+1).Replace('\','/'); bytes=$_.Length; diskBefore=[EvidenceDiskSize]::Size($taskPath); sha256=(Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash; mtime=$_.LastWriteTimeUtc.Ticks; diskAfter=$null}
})
if ($Apply) {
 for($taskOffset=0; $taskOffset -lt $taskRecords.Count; $taskOffset+=30) {
  $taskBatch=@($taskRecords | Select-Object -Skip $taskOffset -First 30 | ForEach-Object {Join-Path $taskRoot $_.file})
  $taskLog = & compact.exe /C /EXE:LZX /Q @taskBatch 2>&1
  if($LASTEXITCODE -ne 0) { throw ($taskLog -join "`n") }
  Write-Host ('Compressed {0}/{1}' -f ([Math]::Min($taskOffset+30,$taskRecords.Count)),$taskRecords.Count)
 }
 foreach($taskRecord in $taskRecords) {
  $taskPath=Join-Path $taskRoot $taskRecord.file
  if((Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash -ne $taskRecord.sha256) {throw ('Hash changed: '+$taskRecord.file)}
  if((Get-Item -LiteralPath $taskPath).LastWriteTimeUtc.Ticks -ne $taskRecord.mtime) {throw ('Timestamp changed: '+$taskRecord.file)}
  $taskRecord.diskAfter=[EvidenceDiskSize]::Size($taskPath)
 }
}
$taskReport=[pscustomobject]@{applied=[bool]$Apply; files=$taskRecords.Count; bytes=($taskRecords|Measure-Object bytes -Sum).Sum; diskBefore=($taskRecords|Measure-Object diskBefore -Sum).Sum; diskAfter=($taskRecords|Measure-Object diskAfter -Sum).Sum; hashesAndTimestampsVerified=[bool]$Apply; records=$taskRecords}
$taskReport | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskRoot 'output/obsolete-copy-audit/internal-evidence-compression.json') -Encoding UTF8
$taskReport | Select-Object -ExcludeProperty records | ConvertTo-Json
