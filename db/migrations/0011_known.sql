CREATE TABLE "known_techniques" (
	"user_id" integer NOT NULL,
	"technique" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "known_techniques_user_id_technique_pk" PRIMARY KEY("user_id","technique")
);
--> statement-breakpoint
ALTER TABLE "known_techniques" ADD CONSTRAINT "known_techniques_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "known_techniques" ADD CONSTRAINT "known_techniques_technique_techniques_slug_fk" FOREIGN KEY ("technique") REFERENCES "public"."techniques"("slug") ON DELETE no action ON UPDATE no action;