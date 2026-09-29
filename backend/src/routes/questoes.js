import { Router } from 'express';
import { questoes, provas } from '../data.js';
import { requireAuth } from '../middleware/auth.js';

export const router = Router();

router.get('/questoes', requireAuth, (req, res) => {
  const { materias, ano, semestre } = req.query;
  let result = questoes;

  if (materias) {
    const lista = String(materias).split(',').map((m) => m.trim());
    result = result.filter((q) => lista.includes(q.materia));
  }
  if (ano) result = result.filter((q) => q.ano === Number(ano));
  if (semestre) result = result.filter((q) => q.semestre === Number(semestre));

  res.json(result);
});

router.get('/provas', requireAuth, (_req, res) => {
  res.json(provas);
});
