import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { respostas, trilhaProgresso } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { topicos, questoes, questoesById } from '../data.js';

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

router.post(
  '/trilha/topicos/:id/quiz',
  requireAuth,
  asyncHandler(async (req, res) => {
    const topicoId = req.params.id;
    const enviadas = req.body?.respostas;
    if (!enviadas || typeof enviadas !== 'object' || Array.isArray(enviadas)) {
      return res.status(400).json({ erro: 'Envie o campo respostas' });
    }

    const entradas = Object.entries(enviadas).filter(
      ([questaoId]) => questoesById.get(questaoId)?.topico === topicoId
    );
    if (entradas.length === 0) {
      return res.status(400).json({ erro: 'Nenhuma resposta válida para este tópico' });
    }

    const questoesCorrigidas = [];
    let acertos = 0;

    const { melhorAcertos, tentativas, aprovado } = await db.transaction(async (tx) => {
      for (const [questaoId, resposta] of entradas) {
        const questao = questoesById.get(questaoId);
        const correta = questao.anulada ? true : resposta === questao.correta;
        if (correta) acertos++;
        await tx.insert(respostas).values({
          userId: req.user.id,
          questaoId,
          resposta,
          correta,
          modo: 'trilha',
        });
        questoesCorrigidas.push(questao);
      }

      const total = entradas.length;
      const aprovadoNestaTentativa = acertos / total >= 0.7;

      const [existente] = await tx
        .select()
        .from(trilhaProgresso)
        .where(and(eq(trilhaProgresso.userId, req.user.id), eq(trilhaProgresso.topicoId, topicoId)));

      const aprovado = aprovadoNestaTentativa || existente?.status === 'aprovado';
      const melhorAcertos = Math.max(acertos, existente?.melhorAcertos ?? 0);
      const tentativas = (existente?.tentativas ?? 0) + 1;
      const status = aprovado ? 'aprovado' : 'reprovado';

      await tx
        .insert(trilhaProgresso)
        .values({ userId: req.user.id, topicoId, status, melhorAcertos, tentativas })
        .onConflictDoUpdate({
          target: [trilhaProgresso.userId, trilhaProgresso.topicoId],
          set: { status, melhorAcertos, tentativas, atualizadoEm: sql`now()` },
        });

      return { melhorAcertos, tentativas, aprovado };
    });

    const total = entradas.length;
    res.json({ acertos, total, aprovado, melhorAcertos, tentativas, questoes: questoesCorrigidas });
  })
);
