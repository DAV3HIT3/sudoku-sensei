CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"ts_login" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_ts_login_unique" UNIQUE("ts_login")
);
