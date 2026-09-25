CREATE TABLE "drills" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_id" integer NOT NULL,
	"technique" text NOT NULL,
	"position" jsonb NOT NULL,
	"step" jsonb NOT NULL,
	CONSTRAINT "drills_puzzle_id_technique_unique" UNIQUE("puzzle_id","technique")
);
--> statement-breakpoint
CREATE TABLE "techniques" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" integer NOT NULL,
	"sort" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "puzzles" ADD COLUMN "difficulty" integer;--> statement-breakpoint
ALTER TABLE "puzzles" ADD COLUMN "techniques" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "drills" ADD CONSTRAINT "drills_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drills" ADD CONSTRAINT "drills_technique_techniques_slug_fk" FOREIGN KEY ("technique") REFERENCES "public"."techniques"("slug") ON DELETE no action ON UPDATE no action;