Add-Type -AssemblyName System.Speech
$narrationSegments = Get-Content 'submission/walkthrough.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$workDirectory = Join-Path (Get-Location) 'submission/video-work'
New-Item -ItemType Directory -Path $workDirectory -Force | Out-Null
$narrator = New-Object System.Speech.Synthesis.SpeechSynthesizer
$narrator.SelectVoice('Microsoft Zira Desktop')
$narrator.Rate = 1
try {
    for ($index=0; $index -lt $narrationSegments.Count; $index++) {
        $wavPath=Join-Path $workDirectory ('{0:d2}.wav' -f $index)
        $narrator.SetOutputToWaveFile($wavPath)
        $narrator.Speak($narrationSegments[$index].speech)
        $narrator.SetOutputToNull()
    }
} finally { $narrator.Dispose() }
