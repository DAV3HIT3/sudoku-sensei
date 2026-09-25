CREATE TABLE "puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"givens" char(81) NOT NULL,
	"solution" char(81) NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "puzzles_givens_unique" UNIQUE("givens")
);
