# Uso: .\Integrar.ps1 -Nome gabriel -A folhaA.png -B folhaB.png [-RowsA 4,4,10] [-RowsB 6,3,5]
# Recorta as duas folhas (fundo magenta), grava os quadros em public/assets/npcs/<nome>/ e cria o manifest.json.
param([Parameter(Mandatory)][string]$Nome,[Parameter(Mandatory)][string]$A,[Parameter(Mandatory)][string]$B,[int[]]$RowsA=@(4,4,10),[int[]]$RowsB=@(6,3,5),[int]$DilateB=0)
$root=Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing,System.Core -Path "$PSScriptRoot\SheetCut.cs" -ErrorAction SilentlyContinue
$work="$PSScriptRoot\_work\$Nome";$dst="$root\public\assets\npcs\$Nome"
New-Item -ItemType Directory -Force $work,$dst | Out-Null
$sideN=$RowsA[2]
$namesA=@(0..3|%{"front$_"})+@(0..3|%{"back$_"})+@(0..($sideN-1)|%{"side$_"})
$nPose=$RowsB[0];$nPort=$RowsB[-1];$nAct=($RowsB|Select -Skip 1|Select -SkipLast 1|Measure-Object -Sum).Sum
$namesB=@(0..($nPose-1)|%{"pose$_"})+@(0..($nAct-1)|%{"act$_"})+@(0..($nPort-1)|%{"portrait$_"})
$ra=[SheetCut]::Run($A,"$work\A",$namesA,$RowsA,0);Write-Output "A: $ra"
$rb=[SheetCut]::Run($B,"$work\B",$namesB,$RowsB,$DilateB);Write-Output "B: $rb"
if($ra -like 'ERRO*' -or $rb -like 'ERRO*'){exit 1}
Get-ChildItem "$work\A\*.png","$work\B\*.png" | Copy-Item -Destination $dst -Force
@{who=$Nome;walk=@{down=@(0..3|%{"front$_"});up=@(0..3|%{"back$_"});side=@(0..($sideN-1)|%{"side$_"})};idle=@{down='front0';up='back0';side='side0'};portraits=@(0..([math]::Min(4,$nPort-1))|%{"portrait$_"});portraitNames=@('neutral','happy','angry','sad','surprised')}|ConvertTo-Json -Depth 5 | Set-Content "$dst\manifest.json" -Encoding utf8
$idx=Get-ChildItem "$root\public\assets\npcs" -Directory | Where-Object { Test-Path "$($_.FullName)\manifest.json" } | ForEach-Object { $_.Name }
ConvertTo-Json -InputObject @($idx) | Set-Content "$root\public\assets\npcs\index.json" -Encoding utf8
Write-Output "OK $Nome -> $dst"
