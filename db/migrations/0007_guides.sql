CREATE TABLE "guides" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sort" integer NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL
);
