CREATE TABLE "auth_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"locked_until" timestamp,
	"lock_count" integer DEFAULT 0 NOT NULL
);
