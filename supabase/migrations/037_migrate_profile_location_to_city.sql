-- Move legacy profile.location values into the newer location_city field.
-- Keep the exact old text, do not parse commas, and do not overwrite existing city data.

UPDATE profiles
SET location_city = NULLIF(TRIM(location), '')
WHERE NULLIF(TRIM(COALESCE(location_city, '')), '') IS NULL
  AND NULLIF(TRIM(COALESCE(location, '')), '') IS NOT NULL;

UPDATE profiles
SET location = NULL
WHERE NULLIF(TRIM(COALESCE(location_city, '')), '') IS NOT NULL
  AND location IS NOT NULL;
