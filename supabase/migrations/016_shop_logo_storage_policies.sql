-- Shop logo storage bucket and owner-scoped upload policies.

INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ShopLogos: public read'
  ) THEN
    CREATE POLICY "ShopLogos: public read" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'shop-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ShopLogos: owner upload'
  ) THEN
    CREATE POLICY "ShopLogos: owner upload" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'shop-logos'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ShopLogos: owner update'
  ) THEN
    CREATE POLICY "ShopLogos: owner update" ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'shop-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'shop-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'ShopLogos: owner delete'
  ) THEN
    CREATE POLICY "ShopLogos: owner delete" ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'shop-logos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
