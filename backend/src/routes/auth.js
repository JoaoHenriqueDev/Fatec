import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

export const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ id: user.id, nome: user.nome, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', (req, res) => {
  const { nome, email, senha, confirmarSenha } = req.body ?? {};
  if (!nome || !email || !senha || !confirmarSenha) {
    return res.status(400).json({ erro: 'Preencha nome, e-mail, senha e confirmação de senha' });
  }
  if (!EMAIL_RE.test(email)) return res.status(400).json({ erro: 'E-mail inválido' });
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
  if (senha !== confirmarSenha) return res.status(400).json({ erro: 'As senhas não conferem' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail' });

  const senha_hash = bcrypt.hashSync(senha, 10);
  const result = db.prepare('INSERT INTO users (nome, email, senha_hash) VALUES (?, ?, ?)').run(nome, email, senha_hash);
  const user = { id: Number(result.lastInsertRowid), nome, email };
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', (req, res) => {
  const { email, senha } = req.body ?? {};
  if (!email || !senha) return res.status(400).json({ erro: 'Preencha e-mail e senha' });

  const row = db.prepare('SELECT id, nome, email, senha_hash FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(senha, row.senha_hash)) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
  }
  const user = { id: row.id, nome: row.nome, email: row.email };
  res.json({ token: signToken(user), user });
});
