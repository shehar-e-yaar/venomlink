-- Examples only: run after the optional Glue/Iceberg table is deployed.
SELECT clinical_status, COUNT(*) AS records
FROM venomlink.independent_facilities_v1
GROUP BY clinical_status;

SELECT id, name, source_url
FROM venomlink.independent_facilities_v1
WHERE clinical_status = 'unknown';
