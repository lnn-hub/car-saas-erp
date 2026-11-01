-- Систем нэг компанит болсон. Хуучин (олон компанит) сан дээр company_id баганыг заавал бөглөх шаардлагагүй
-- болгоно. Өгөгдөл устахгүй. Анх шилжихэд үндсэн (хамгийн анх үүссэн) компаниас бусад тест компанийн
-- ажилтнуудыг идэвхгүй болгоно, эс бөгөөс тэд энэ компанийн бүх өгөгдлийг харах болно.
-- Шинэ сан дээр company_id байхгүй тул юу ч хийхгүй.
DO $$
DECLARE
  t TEXT;
  primary_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'company_id' AND table_name = 'users' AND is_nullable = 'NO'
  ) THEN
    SELECT id INTO primary_id FROM companies ORDER BY created_at ASC LIMIT 1;
    EXECUTE 'UPDATE users SET is_active = FALSE WHERE is_active AND company_id IS DISTINCT FROM $1' USING primary_id;
  END IF;

  FOREACH t IN ARRAY ARRAY['users', 'vehicles', 'customers', 'sales', 'leads', 'team_members'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id' AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id DROP NOT NULL', t);
    END IF;
  END LOOP;
END $$;
