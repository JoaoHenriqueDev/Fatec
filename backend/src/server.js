import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';

import { router as authRouter } from './routes/auth.js';
import { router as questoesRouter } from './routes/questoes.js';
import { router as redacoesRouter } from './routes/redacoes.js';
import { router as respostasRouter } from './routes/respostas.js';
import { router as simuladosRouter } from './routes/simulados.js';
import { router as estatisticasRouter } from './routes/estatisticas.js';
import { router as trilhaRouter } from './routes/trilha.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
app.use(trilhaRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Em produção o próprio backend serve o build do frontend (deploy como um serviço só).
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
