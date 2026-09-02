CREATE TABLE "notifications_sent" (
	"key" text PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_chat_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_link_code" text;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "kind" text DEFAULT 'strength' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_invite_token_unique" UNIQUE("invite_token");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_telegram_link_code_unique" UNIQUE("telegram_link_code");