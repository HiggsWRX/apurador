# A tarefa do Agendador do Windows que inicia o supervisor do coletor ao ligar o computador, sem login (Operação na
# noite, decisões 3 e 15): depois de um reinício ou de uma falta de luz, o coletor volta sozinho e retoma do estado em
# disco. O dono roda este script uma vez, no PowerShell, da raiz do repositório:
#
#   powershell -ExecutionPolicy Bypass -File packages\coletor\agendador\criar-tarefa.ps1 -Destino producao
#
# Ele pede a senha do Windows do dono (a tarefa roda sem login com ela) e cria a tarefa desligada: fora da noite, ela
# não inicia nada. Na noite e nos ensaios:
#
#   ligar:    Enable-ScheduledTask -TaskName "Apurador coletor"; Start-ScheduledTask -TaskName "Apurador coletor"
#   desligar: Stop-ScheduledTask -TaskName "Apurador coletor"; Disable-ScheduledTask -TaskName "Apurador coletor"
#
# Sem login, o coletor não tem terminal nem som: o log fica em .cache\coletor\coletor-<dia>.log (acompanhe com
# Get-Content .cache\coletor\coletor-<dia>.log -Wait -Tail 40), o painel em .cache\coletor\painel.html, e os alertas
# críticos chegam pelo ntfy. Se o próprio supervisor cair, o Agendador o reinicia em 1 min.

param(
  # O --destino do coletor: producao na noite e em 24/10, ensaio nos ensaios gerais.
  [ValidateSet("producao", "ensaio")][string]$Destino = "producao",
  [string]$Nome = "Apurador coletor"
)

$ErrorActionPreference = "Stop"
$raiz = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$node = (Get-Command node).Source
$acao = New-ScheduledTaskAction -Execute $node -Argument "--import tsx packages/coletor/src/supervisionar.ts --destino $Destino" -WorkingDirectory $raiz
$gatilho = New-ScheduledTaskTrigger -AtStartup
$configuracao = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$credencial = Get-Credential -UserName "$env:USERDOMAIN\$env:USERNAME" -Message "A senha do Windows, para o coletor voltar sem login"
Register-ScheduledTask -TaskName $Nome -Action $acao -Trigger $gatilho -Settings $configuracao `
  -User $credencial.UserName -Password $credencial.GetNetworkCredential().Password -RunLevel Limited -Force | Out-Null
Disable-ScheduledTask -TaskName $Nome | Out-Null
Write-Host "Tarefa `"$Nome`" criada, desligada: supervisor do coletor com --destino $Destino, em $raiz, ao ligar o computador."
Write-Host "Ligue-a na noite com: Enable-ScheduledTask -TaskName `"$Nome`"; Start-ScheduledTask -TaskName `"$Nome`""
