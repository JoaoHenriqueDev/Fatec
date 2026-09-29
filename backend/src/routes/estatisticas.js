import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { questoesById } from '../data.js';

export const router = Router();

router.get('/estatisticas', requireAuth, (req, res) => {
  const respostas = db.prepare('SELECT * FROM respostas WHERE user_id = ? ORDER BY data ASC').all(req.user.id);

  const geralTotal = respostas.length;
  const geralAcertos = respostas.filter((r) => r.correta).length;
  const geralPercentual = geralTotal > 0 ? Math.round((geralAcertos / geralTotal) * 1000) / 10 : 0;

  const porMateriaMap = new Map();
  for (const r of respostas) {
    const questao = questoesById.get(r.questao_id);
    const materia = questao?.materia ?? 'Interdisciplinar';
    if (!porMateriaMap.has(materia)) porMateriaMap.set(materia, { materia, acertos: 0, total: 0 });
    const entry = porMateriaMap.get(materia);
    entry.total++;
    if (r.correta) entry.acertos++;
  }
  const porMateria = [...porMateriaMap.values()]
    .map((m) => ({ ...m, percentual: Math.round((m.acertos / m.total) * 1000) / 10 }))
    .sort((a, b) => b.percentual - a.percentual);

  const porDiaMap = new Map();
  for (const r of respostas) {
    const dia = r.data.slice(0, 10);
    if (!porDiaMap.has(dia)) porDiaMap.set(dia, { data: dia, acertos: 0, total: 0 });
    const entry = porDiaMap.get(dia);
    entry.total++;
    if (r.correta) entry.acertos++;
  }
  const evolucao = [...porDiaMap.values()]
    .map((d) => ({ ...d, percentual: Math.round((d.acertos / d.total) * 1000) / 10 }))
    .sort((a, b) => a.data.localeCompare(b.data));

  const historicoSimulados = db
    .prepare('SELECT * FROM simulados WHERE user_id = ? AND fim IS NOT NULL ORDER BY fim DESC')
    .all(req.user.id);

  res.json({
    geral: { acertos: geralAcertos, total: geralTotal, percentual: geralPercentual },
    porMateria,
    evolucao,
    historicoSimulados,
    maisForte: porMateria[0] ?? null,
    maisFraca: porMateria[porMateria.length - 1] ?? null,
  });
});
