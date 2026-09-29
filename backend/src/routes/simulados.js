import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { questoes } from '../data.js';

export const router = Router();

router.post('/simulados', requireAuth, (req, res) => {
  const { ano, semestre } = req.body ?? {};
  if (!ano || !semestre) return res.status(400).json({ erro: 'Preencha ano e semestre' });

  const total = questoes.filter((q) => q.ano === Number(ano) && q.semestre === Number(semestre)).length;
  if (total === 0) return res.status(404).json({ erro: 'Nenhuma questão encontrada para esse ano/semestre' });

  const result = db
    .prepare('INSERT INTO simulados (user_id, ano, semestre, total) VALUES (?, ?, ?, ?)')
    .run(req.user.id, Number(ano), Number(semestre), total);

  res.status(201).json({ id: Number(result.lastInsertRowid), ano: Number(ano), semestre: Number(semestre), total });
});

router.put('/simulados/:id/finalizar', requireAuth, (req, res) => {
  const simulado = db.prepare('SELECT * FROM simulados WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!simulado) return res.status(404).json({ erro: 'Simulado não encontrado' });
  if (simulado.fim) return res.status(409).json({ erro: 'Simulado já finalizado' });

  const { acertos } = db
    .prepare('SELECT COUNT(*) as acertos FROM respostas WHERE simulado_id = ? AND correta = 1')
    .get(req.params.id);

  db.prepare("UPDATE simulados SET fim = datetime('now'), acertos = ? WHERE id = ?").run(acertos, req.params.id);

  const atualizado = db.prepare('SELECT * FROM simulados WHERE id = ?').get(req.params.id);
  res.json(atualizado);
});
