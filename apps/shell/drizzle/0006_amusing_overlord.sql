ALTER TABLE "auth_attempts" ALTER COLUMN "window_start" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_attempts" ALTER COLUMN "window_start" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "auth_attempts" ALTER COLUMN "locked_until" SET DATA TYPE timestamp with time zone;