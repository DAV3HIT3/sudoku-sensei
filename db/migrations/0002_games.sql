CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"state" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "games_user_id_puzzle_id_unique" UNIQUE("user_id","puzzle_id")
);
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;