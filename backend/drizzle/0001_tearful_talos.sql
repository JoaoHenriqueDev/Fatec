CREATE TABLE "trilha_progresso" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"topico_id" text NOT NULL,
	"status" text DEFAULT 'nao_iniciado' NOT NULL,
	"melhor_acertos" integer,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trilha_progresso_user_topico" UNIQUE("user_id","topico_id"),
	CONSTRAINT "status_check" CHECK ("trilha_progresso"."status" IN ('nao_iniciado', 'reprovado', 'aprovado'))
);
--> statement-breakpoint
ALTER TABLE "respostas" DROP CONSTRAINT "modo_check";--> statement-breakpoint
ALTER TABLE "trilha_progresso" ADD CONSTRAINT "trilha_progresso_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas" ADD CONSTRAINT "modo_check" CHECK ("respostas"."modo" IN ('pratica', 'simulado', 'trilha'));