import express from 'express';
import cors from 'cors';
import './db.js';

import { router as authRouter } from './routes/auth.js';
import { router as questoesRouter } from './routes/questoes.js';
import { router as redacoesRouter } from './routes/redacoes.js';
import { router as respostasRouter } from './routes/respostas.js';
import { router as simuladosRouter } from './routes/simulados.js';
import { router as estatisticasRouter } from './routes/estatisticas.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use(questoesRouter);
app.use(redacoesRouter);
app.use(respostasRouter);
app.use(simuladosRouter);
app.use(estatisticasRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
