import { Router } from 'express';
import { eq, and, isNotNull, asc, desc } from 'drizzle-orm';
import { db } from '../db.js';
import { respostas, simulados } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { questoesById } from '../data.js';

export const router = Router();

router.get(
  '/estatisticas',
  requireAuth,
  asyncHandler(async (req, res) => {
    const historico = await db
      .select()
      .from(respostas)
      .where(eq(respostas.userId, req.user.id))
      .orderBy(asc(respostas.data));

    const geralTotal = historico.length;
    const geralAcertos = historico.filter((r) => r.correta).length;
    const geralPercentual = geralTotal > 0 ? Math.round((geralAcertos / geralTotal) * 1000) / 10 : 0;

    const porMateriaMap = new Map();
    for (const r of historico) {
      const questao = questoesById.get(r.questaoId);
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
    for (const r of historico) {
      const dia = r.data.slice(0, 10);
      if (!porDiaMap.has(dia)) porDiaMap.set(dia, { data: dia, acertos: 0, total: 0 });
      const entry = porDiaMap.get(dia);
      entry.total++;
      if (r.correta) entry.acertos++;
    }
    const evolucao = [...porDiaMap.values()]
      .map((d) => ({ ...d, percentual: Math.round((d.acertos / d.total) * 1000) / 10 }))
      .sort((a, b) => a.data.localeCompare(b.data));

    const historicoSimulados = await db
      .select()
      .from(simulados)
      .where(and(eq(simulados.userId, req.user.id), isNotNull(simulados.fim)))
      .orderBy(desc(simulados.fim));

    res.json({
      geral: { acertos: geralAcertos, total: geralTotal, percentual: geralPercentual },
      porMateria,
      evolucao,
      historicoSimulados,
      maisForte: porMateria[0] ?? null,
      maisFraca: porMateria[porMateria.length - 1] ?? null,
    });
  })
);
