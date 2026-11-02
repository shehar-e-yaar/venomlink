"""Download real OSM hospital coordinates and road/river geometry, not capabilities."""
import urllib.request,urllib.parse,json
from pathlib import Path
query='[out:json][timeout:30];nwr[amenity=hospital](31.35,74.15,31.70,74.60);out center tags;'
req=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'VenomLink/1.0 geospatial research'})
with urllib.request.urlopen(req,timeout=70) as r: raw=r.read()
Path('data/osm-hospitals.json').write_bytes(raw)
print('Saved',len(json.loads(raw)['elements']),'hospital features from OSM')
