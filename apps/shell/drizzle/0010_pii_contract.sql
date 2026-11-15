DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "email_hash" IS NULL OR "email_enc" IS NULL OR "name_enc" IS NULL) THEN
    RAISE EXCEPTION 'Há usuários com e-mail ou nome ainda em claro: rode npm run db:backfill-pii -w @bytebank/shell antes de migrar';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_enc" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name_enc" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email";