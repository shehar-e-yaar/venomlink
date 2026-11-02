"""Local validation by default. --upload writes independent data to your S3.
Optional --iceberg writes a dedicated Glue table; Google/AWS Places results
are never ingested. Use AWS's standard profile/role credential chain.
"""
import argparse,json,hashlib
from pathlib import Path
from validate_facilities import validate
def main():
    p=argparse.ArgumentParser();p.add_argument('--input',default='public/data/facilities.json');p.add_argument('--bucket');p.add_argument('--region',default='ap-south-1');p.add_argument('--upload',action='store_true');p.add_argument('--iceberg',action='store_true');a=p.parse_args();data,errors=validate(a.input)
    if errors:raise ValueError(json.dumps(errors))
    print(json.dumps({'valid_records':len(data['facilities']),'version':data['version'],'sha256':hashlib.sha256(Path(a.input).read_bytes()).hexdigest(),'cloud_writes':a.upload or a.iceberg}))
    if not(a.upload or a.iceberg):return
    if not a.bucket:p.error('--bucket is required for cloud writes')
    import boto3
    if a.upload:
        s3=boto3.client('s3',region_name=a.region)
        for local,key in [(a.input,'validated/facilities.json'),('public/data/communities.json','planning/communities.json'),('data/osm-hospitals.json','raw/osm-hospitals.json')]:
            s3.put_object(Bucket=a.bucket,Key=key,Body=Path(local).read_bytes(),ContentType='application/json',ServerSideEncryption='AES256')
            print('Uploaded independent data:',key)
    if a.iceberg:
        import pyarrow as pa
        from pyiceberg.catalog import load_catalog
        from pyiceberg.exceptions import NoSuchTableError
        from pyiceberg.schema import Schema
        from pyiceberg.types import NestedField,StringType,DoubleType
        schema=Schema(NestedField(1,'id',StringType(),required=False),NestedField(2,'name',StringType(),required=False),NestedField(3,'lat',DoubleType(),required=False),NestedField(4,'lng',DoubleType(),required=False),NestedField(5,'clinical_status',StringType(),required=False),NestedField(6,'source_url',StringType(),required=False),NestedField(7,'dataset_version',StringType(),required=False))
        cat=load_catalog('venomlink',type='glue',**{'warehouse':f's3://{a.bucket}/warehouse','glue.region':a.region,'s3.region':a.region});cat.create_namespace_if_not_exists('venomlink');identifier='venomlink.independent_facilities_v1'
        try:table=cat.load_table(identifier)
        except NoSuchTableError:table=cat.create_table(identifier,schema=schema)
        arrow=pa.Table.from_pylist([{'id':f['id'],'name':f['name'],'lat':float(f['lat']),'lng':float(f['lng']),'clinical_status':f['clinicalStatus'],'source_url':f['sourceUrl'],'dataset_version':data['version']}for f in data['facilities']])
        table.overwrite(arrow);print('Committed dedicated Iceberg snapshot:',identifier)
if __name__=='__main__':main()
