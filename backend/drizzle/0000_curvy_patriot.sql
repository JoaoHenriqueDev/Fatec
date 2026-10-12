CREATE TABLE "respostas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"questao_id" text NOT NULL,
	"resposta" text NOT NULL,
	"correta" boolean NOT NULL,
	"modo" text NOT NULL,
	"simulado_id" integer,
	"data" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "modo_check" CHECK ("respostas"."modo" IN ('pratica', 'simulado'))
);
--> statement-breakpoint
CREATE TABLE "simulados" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ano" integer NOT NULL,
	"semestre" integer NOT NULL,
	"inicio" timestamp DEFAULT now() NOT NULL,
	"fim" timestamp,
	"acertos" integer,
	"total" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_simulado_id_simulados_id_fk" FOREIGN KEY ("simulado_id") REFERENCES "public"."simulados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulados" ADD CONSTRAINT "simulados_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_respostas_user" ON "respostas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_simulados_user" ON "simulados" USING btree ("user_id");