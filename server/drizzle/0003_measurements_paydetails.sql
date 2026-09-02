CREATE TABLE "measurements" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"client_id" text NOT NULL,
	"date" date NOT NULL,
	"weight_kg" real,
	"chest" real,
	"waist" real,
	"belly" real,
	"sides" real,
	"hips" real,
	"thigh" real,
	"biceps" real,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pay_details" text;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;