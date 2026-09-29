import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { questoesById } from '../data.js';

export const router = Router();

router.post('/respostas', requireAuth, (req, res) => {
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

  const result = db
    .prepare('INSERT INTO respostas (user_id, questao_id, resposta, correta, modo, simulado_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, questao_id, resposta, correta ? 1 : 0, modo, simulado_id ?? null);

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    questao_id,
    resposta,
    correta,
    correctAnswer: questao.correta,
  });
});
