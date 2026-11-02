"""Validate independent facility records. Never infer medical suitability."""
import json,math,argparse
from pathlib import Path
def validate(path):
    d=json.loads(Path(path).read_text(encoding='utf-8'));ids=set();errors=[]
    for i,f in enumerate(d['facilities']):
        try:
            assert f['id'] not in ids,'duplicate ID';ids.add(f['id'])
            assert f['name'].strip(),'empty name'
            assert math.isfinite(f['lat']) and math.isfinite(f['lng']),'nonfinite coordinates'
            assert 31.2<=f['lat']<=31.8 and 74<=f['lng']<=74.7,'outside study area / reversed coordinates'
            assert f['sourceUrl'].startswith('https://') and f['coordinateSource'].startswith('https://'),'missing sources'
            assert f['clinicalStatus'] in ['unknown','confirmed','not-human-care'],'invalid status'
            if f['clinicalStatus']=='confirmed':assert f['capabilityVerifiedAt'],'confirmation requires timestamp'
            if f['kind']=='reference':assert not f['planningEligible'] and f['clinicalStatus']=='not-human-care','reference incorrectly eligible'
        except (AssertionError,KeyError,TypeError) as e:errors.append({'row':i,'id':f.get('id'),'error':str(e)})
    return d,errors
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--input',default='public/data/facilities.json');a=p.parse_args();d,errors=validate(a.input)
    print(json.dumps({'records':len(d['facilities']),'errors':errors}))
    raise SystemExit(1 if errors else 0)
