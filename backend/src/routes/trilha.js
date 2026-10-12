import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { trilhaProgresso } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { topicos } from '../data.js';

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
