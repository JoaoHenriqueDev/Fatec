import { Router } from 'express';
import { db } from '../db.js';
import { respostas } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { questoesById } from '../data.js';

export const router = Router();

router.post(
  '/respostas',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { questao_id, resposta, modo, simulado_id } = req.body ?? {};
    if (!questao_id || !resposta || !modo) {
      return res.status(400).json({ erro: 'Preencha questao_id, resposta e modo' });
    }
    if (!['pratica', 'simulado'].includes(modo)) {
      return res.status(400).json({ erro: 'modo deve ser "pratica" ou "simulado"' });
    }
    const questao = questoesById.get(questao_id);
    if (!questao) return res.status(404).json({ erro: 'Questão não encontrada' });

    const correta = questao.anulada ? true : resposta === questao.correta;

    const [inserted] = await db
      .insert(respostas)
      .values({
        userId: req.user.id,
        questaoId: questao_id,
        resposta,
        correta,
        modo,
        simuladoId: simulado_id ?? null,
      })
      .returning();

    res.status(201).json({
      id: inserted.id,
      questao_id,
      resposta,
      correta,
      correctAnswer: questao.correta,
    });
  })
);
