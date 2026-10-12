import { pgTable, serial, text, integer, boolean, timestamp, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  criadoEm: timestamp('criado_em', { mode: 'string' }).notNull().defaultNow(),
});

export const simulados = pgTable(
  'simulados',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    ano: integer('ano').notNull(),
    semestre: integer('semestre').notNull(),
    inicio: timestamp('inicio', { mode: 'string' }).notNull().defaultNow(),
    fim: timestamp('fim', { mode: 'string' }),
    acertos: integer('acertos'),
    total: integer('total'),
  },
  (table) => [index('idx_simulados_user').on(table.userId)]
);

export const respostas = pgTable(
  'respostas',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    questaoId: text('questao_id').notNull(),
    resposta: text('resposta').notNull(),
    correta: boolean('correta').notNull(),
    modo: text('modo').notNull(),
    simuladoId: integer('simulado_id').references(() => simulados.id),
    data: timestamp('data', { mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [
    check('modo_check', sql`${table.modo} IN ('pratica', 'simulado')`),
    index('idx_respostas_user').on(table.userId),
  ]
);
