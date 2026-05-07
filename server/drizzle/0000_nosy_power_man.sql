CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" varchar(36) NOT NULL,
	"game_type" varchar(20) NOT NULL,
	"players" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"moves" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"total_rounds" integer DEFAULT 1 NOT NULL,
	"winner_user_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"display_name" varchar(30) NOT NULL,
	"avatar_url" varchar(500) DEFAULT '' NOT NULL,
	"role" varchar(10) DEFAULT 'player' NOT NULL,
	"is_guest" boolean DEFAULT false NOT NULL,
	"bio" varchar(200) DEFAULT '' NOT NULL,
	"stats" jsonb DEFAULT '{"wins":0,"losses":0,"draws":0,"gamesPlayed":0}'::jsonb NOT NULL,
	"stats_by_game" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preferences" jsonb DEFAULT '{"theme":"system","fontSize":"medium","animations":true,"sounds":true,"language":"en","notifications":{"matchInvite":true,"rematch":true},"privacy":{"showStats":true,"showOnLeaderboard":true}}'::jsonb NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_user_id_users_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_winner_idx" ON "matches" USING btree ("winner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "matches_game_created_idx" ON "matches" USING btree ("game_type","created_at");--> statement-breakpoint
CREATE INDEX "matches_room_code_idx" ON "matches" USING btree ("room_code");--> statement-breakpoint
CREATE INDEX "users_stats_wins_idx" ON "users" USING btree ((("stats"->>'wins')::int));--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");