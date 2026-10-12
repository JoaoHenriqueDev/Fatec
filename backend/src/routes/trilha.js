import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { trilhaProgresso } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { topicos, questoes } from '../data.js';

export const router = Router();

router.get(
  '/trilha/topicos',
  requireAuth,
  asyncHandler(async (req, res) => {
    const progresso = await db.select().from(trilhaProgresso).where(eq(trilhaProgresso.userId, req.user.id));
    const progressoPorTopico = new Map(progresso.map((p) => [p.topicoId, p]));

    const resultado = topicos.map((t) => {
      const p = progressoPorTopico.get(t.id);
      return {
        ...t,
        status: p?.status ?? 'nao_iniciado',
        melhorAcertos: p?.melhorAcertos ?? null,
        tentativas: p?.tentativas ?? 0,
      };
    });

    res.json(resultado);
  })
);

function sortear(lista, n) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}

router.get(
  '/trilha/topicos/:id/quiz',
  requireAuth,
  asyncHandler(async (req, res) => {
    const pool = questoes.filter((q) => q.topico === req.params.id);
    if (pool.length === 0) {
      return res.status(404).json({ erro: 'Ainda não há questões cadastradas para este tópico' });
    }
    const sorteadas = sortear(pool, Math.min(10, pool.length));
    const semGabarito = sorteadas.map(({ correta, ...resto }) => resto);
    res.json(semGabarito);
  })
);
