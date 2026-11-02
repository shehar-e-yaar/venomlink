"""Reproduce independent facility records. No stock/capability inference."""
import json
from pathlib import Path
from datetime import datetime,timezone
raw=json.loads(Path('data/osm-hospitals.json').read_text(encoding='utf-8'))
lookup={e['id']:e for e in raw['elements']}
gov='https://pitb.gov.pk/system/files/DC-15.pdf'
official='https://health.punjab.gov.pk/uploads/circular/10364Circular%20letter%20for%20chelum%20of%20hazrat%20imam%20hussain.pdf'
# Published government coordinates are converted from the stated DMS values.
records=[('mayo','Mayo Hospital','Walled City',151736920,True),('jinnah','Jinnah Hospital','Faisal Town',996202526,True),('services','Services Hospital','Jail Road',152319376,True),('ganga-ram','Sir Ganga Ram Hospital','Queen’s Road',231838075,True),('general','Lahore General Hospital','Ferozepur Road',151735321,True),('shaikh-zayed','Shaikh Zayed Hospital','Muslim Town',230676451,True),('yakki-gate','Government Nawaz Sharif Hospital','Yakki Gate',761860753,False)]
out=[];now=datetime.now(timezone.utc).isoformat()
for id,name,area,osm_id,eligible in records:
    e=lookup[osm_id];p=e.get('center',e)
    out.append({'id':id,'name':name,'neighborhood':area,'lat':p['lat'],'lng':p['lon'],'kind':'human-hospital','coordinateSource':f"https://www.openstreetmap.org/{e['type']}/{osm_id}",'coordinateQuality':'OSM feature center' if 'center'in e else 'OSM node','sourceUrl':official,'sourceOrganization':'Punjab Health Department + OpenStreetMap','sourceDate':'2023-08-26','locationStatus':'source-linked','reviewedAt':now,'clinicalStatus':'unknown','capabilityVerifiedAt':None,'antivenomStatus':'unknown','planningEligible':eligible,'side':'south'})
for id,name,area,lat,lng,side,eligible in [('shahdara-teaching','Government Shahdara Teaching Hospital','Shahdara',31+38/60+17.3/3600,74+17/60+8.7/3600,'north',False),('shahdara-thq','Government Hospital Shahdara Town (THQ Level)','Shahdara Town',31+37/60+37.4113/3600,74+18/60+27.3586/3600,'north',False),('kot-khawaja','Kot Khawaja Saeed Teaching Hospital','Bhagatpura',31+35/60+38.4/3600,74+21/60+15/3600,'south',False)]:
    out.append({'id':id,'name':name,'neighborhood':area,'lat':lat,'lng':lng,'kind':'human-hospital','coordinateSource':gov,'coordinateQuality':'Government tender coordinate (2024), not entrance survey','sourceUrl':gov,'sourceOrganization':'Punjab Information Technology Board','sourceDate':'2024-03-15','locationStatus':'source-linked','reviewedAt':now,'clinicalStatus':'unknown','capabilityVerifiedAt':None,'antivenomStatus':'unknown','planningEligible':eligible,'side':side})
out.append({'id':'uvas','name':'UVAS City Campus','neighborhood':'Outfall Road','lat':31.5763,'lng':74.3007,'kind':'reference','coordinateSource':'https://www.uvas.edu.pk/','coordinateQuality':'Approximate campus reference point','sourceUrl':'https://www.uvas.edu.pk/','sourceOrganization':'UVAS','sourceDate':None,'locationStatus':'approximate','reviewedAt':now,'clinicalStatus':'not-human-care','capabilityVerifiedAt':None,'antivenomStatus':'not-applicable','planningEligible':False,'side':'south'})
payload={'version':'lahore-facilities-v1','ingestedAt':now,'source':'Independent public records; no AWS discovery or Google content stored','license':'OSM coordinates: ODbL. Government factual coordinates: attributed public document; no broad document reuse license asserted.','facilities':out}
Path('public/data/facilities.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(out)} source-linked records; 0 confirmed snakebite capabilities; 0 verified antivenom stocks')
