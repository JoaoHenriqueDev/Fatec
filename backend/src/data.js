import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

export const questoes = JSON.parse(fs.readFileSync(path.join(dataDir, 'questoes.json'), 'utf8'));
export const redacoes = JSON.parse(fs.readFileSync(path.join(dataDir, 'redacoes.json'), 'utf8'));

export const questoesById = new Map(questoes.map((q) => [q.id, q]));

export const provas = [...new Set(questoes.map((q) => `${q.ano}-${q.semestre}`))]
  .map((key) => {
    const [ano, semestre] = key.split('-').map(Number);
    return { ano, semestre, totalQuestoes: questoes.filter((q) => q.ano === ano && q.semestre === semestre).length };
  })
  .sort((a, b) => b.ano - a.ano || b.semestre - a.semestre);
