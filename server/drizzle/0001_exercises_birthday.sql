CREATE TABLE "exercise_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"trainer_id" text NOT NULL,
	"client_id" text NOT NULL,
	"workout_id" text,
	"date" date NOT NULL,
	"exercise" text NOT NULL,
	"weight_kg" real,
	"reps" integer,
	"sets" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "birthday" date;--> statement-breakpoint
ALTER TABLE "exercise_entries" ADD CONSTRAINT "exercise_entries_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_entries" ADD CONSTRAINT "exercise_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_entries" ADD CONSTRAINT "exercise_entries_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE set null ON UPDATE no action;