import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

export const questoes = JSON.parse(fs.readFileSync(path.join(dataDir, 'questoes.json'), 'utf8'));
export const redacoes = JSON.parse(fs.readFileSync(path.join(dataDir, 'redacoes.json'), 'utf8'));
export const topicos = JSON.parse(fs.readFileSync(path.join(dataDir, 'topicos.json'), 'utf8'));

const questoesTopicos = JSON.parse(fs.readFileSync(path.join(dataDir, 'questoes-topicos.json'), 'utf8'));
for (const questao of questoes) {
  questao.topico = questoesTopicos[questao.id] ?? null;
}

export const questoesById = new Map(questoes.map((q) => [q.id, q]));

export const provas = [...new Set(questoes.map((q) => `${q.ano}-${q.semestre}`))]
  .map((key) => {
    const [ano, semestre] = key.split('-').map(Number);
    return { ano, semestre, totalQuestoes: questoes.filter((q) => q.ano === ano && q.semestre === semestre).length };
  })
  .sort((a, b) => b.ano - a.ano || b.semestre - a.semestre);
