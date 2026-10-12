import { Router } from 'express';
import { eq, and, count, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { simulados, respostas } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { questoes } from '../data.js';

export const router = Router();

router.post(
  '/simulados',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ano, semestre } = req.body ?? {};
    if (!ano || !semestre) return res.status(400).json({ erro: 'Preencha ano e semestre' });

    const total = questoes.filter((q) => q.ano === Number(ano) && q.semestre === Number(semestre)).length;
    if (total === 0) return res.status(404).json({ erro: 'Nenhuma questão encontrada para esse ano/semestre' });

    const [inserted] = await db
      .insert(simulados)
      .values({ userId: req.user.id, ano: Number(ano), semestre: Number(semestre), total })
      .returning();

    res.status(201).json({ id: inserted.id, ano: Number(ano), semestre: Number(semestre), total });
  })
);

router.put(
  '/simulados/:id/finalizar',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [simulado] = await db
      .select()
      .from(simulados)
      .where(and(eq(simulados.id, id), eq(simulados.userId, req.user.id)));
    if (!simulado) return res.status(404).json({ erro: 'Simulado não encontrado' });
    if (simulado.fim) return res.status(409).json({ erro: 'Simulado já finalizado' });

    const [{ acertos }] = await db
      .select({ acertos: count() })
      .from(respostas)
      .where(and(eq(respostas.simuladoId, id), eq(respostas.correta, true)));

    const [atualizado] = await db
      .update(simulados)
      .set({ fim: sql`now()`, acertos })
      .where(eq(simulados.id, id))
      .returning();

    res.json(atualizado);
  })
);
