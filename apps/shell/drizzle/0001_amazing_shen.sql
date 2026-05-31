CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "user_id" text DEFAULT 'joana' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;