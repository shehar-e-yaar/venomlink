"""Approximate sentence timings from the generated narration WAV durations."""
import json,re,wave
from pathlib import Path
def stamp(t):
    ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02}.{ms:03}'
out=['WEBVTT',''];cursor=0
for i,segment in enumerate(json.loads(Path('submission/walkthrough.json').read_text(encoding='utf-8'))):
    with wave.open(f'submission/video-work/{i:02}.wav') as wav:duration=wav.getnframes()/wav.getframerate()
    sentences=re.split(r'(?<=[.!?])\s+',segment['speech']);weight=sum(len(s.split()) for s in sentences)
    for sentence in sentences:
        end=cursor+duration*len(sentence.split())/weight
        out.extend([f'{stamp(cursor)} --> {stamp(end)}',sentence,'']);cursor=end
    cursor+=0.8
Path('public/walkthrough.vtt').write_text('\n'.join(out),encoding='utf-8')
