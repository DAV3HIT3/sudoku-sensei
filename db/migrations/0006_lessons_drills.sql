CREATE TABLE "drill_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"drill_id" integer NOT NULL,
	"correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" integer NOT NULL,
	"technique" text NOT NULL,
	"stage" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_technique_pk" PRIMARY KEY("user_id","technique")
);
--> statement-breakpoint
ALTER TABLE "drill_attempts" ADD CONSTRAINT "drill_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_attempts" ADD CONSTRAINT "drill_attempts_drill_id_drills_id_fk" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_technique_techniques_slug_fk" FOREIGN KEY ("technique") REFERENCES "public"."techniques"("slug") ON DELETE no action ON UPDATE no action;