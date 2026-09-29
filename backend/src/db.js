import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR permite apontar para um volume persistente (ex: no Railway) em vez do
// diretório local do projeto, já que o filesystem do container é efêmero por padrão.
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'app.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS respostas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    questao_id TEXT NOT NULL,
    resposta TEXT NOT NULL,
    correta INTEGER NOT NULL,
    modo TEXT NOT NULL CHECK (modo IN ('pratica', 'simulado')),
    simulado_id INTEGER REFERENCES simulados(id),
    data TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS simulados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    ano INTEGER NOT NULL,
    semestre INTEGER NOT NULL,
    inicio TEXT NOT NULL DEFAULT (datetime('now')),
    fim TEXT,
    acertos INTEGER,
    total INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_respostas_user ON respostas(user_id);
  CREATE INDEX IF NOT EXISTS idx_simulados_user ON simulados(user_id);
`);
