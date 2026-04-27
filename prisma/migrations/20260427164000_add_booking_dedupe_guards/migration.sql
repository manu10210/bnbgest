-- Indexes to speed up dedupe lookups used by API and importer sync flows
CREATE INDEX IF NOT EXISTS "bookings_propertyId_confirmationCode_idx"
ON "bookings"("propertyId", "confirmationCode");

CREATE INDEX IF NOT EXISTS "bookings_propertyId_guestEmail_checkIn_checkOut_idx"
ON "bookings"("propertyId", "guestEmail", "checkIn", "checkOut");

CREATE INDEX IF NOT EXISTS "bookings_propertyId_guestName_checkIn_checkOut_idx"
ON "bookings"("propertyId", "guestName", "checkIn", "checkOut");

-- Guard against new duplicate confirmation codes per property.
-- We use a trigger (instead of a strict unique index) to avoid breaking existing
-- legacy duplicates while preventing any new duplicate writes.
CREATE OR REPLACE FUNCTION prevent_booking_duplicate_confirmation_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."confirmationCode" IS NULL OR btrim(NEW."confirmationCode") = '' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "bookings" b
    WHERE b."propertyId" = NEW."propertyId"
      AND b."id" <> COALESCE(NEW."id", -1)
      AND upper(btrim(COALESCE(b."confirmationCode", ''))) = upper(btrim(NEW."confirmationCode"))
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Duplicate booking confirmation code for property',
      DETAIL = format('propertyId=%s confirmationCode=%s', NEW."propertyId", NEW."confirmationCode");
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_booking_duplicate_confirmation_code ON "bookings";

CREATE TRIGGER trg_prevent_booking_duplicate_confirmation_code
BEFORE INSERT OR UPDATE OF "confirmationCode", "propertyId"
ON "bookings"
FOR EACH ROW
EXECUTE FUNCTION prevent_booking_duplicate_confirmation_code();
