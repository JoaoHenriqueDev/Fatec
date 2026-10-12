import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { users } from '../schema.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIQUE_VIOLATION = '23505';

function signToken(user) {
  return jwt.sign({ id: user.id, nome: user.nome, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { nome, email, senha, confirmarSenha } = req.body ?? {};
    if (!nome || !email || !senha || !confirmarSenha) {
      return res.status(400).json({ erro: 'Preencha nome, e-mail, senha e confirmação de senha' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ erro: 'E-mail inválido' });
    if (senha.length < 6) return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
    if (senha !== confirmarSenha) return res.status(400).json({ erro: 'As senhas não conferem' });

    const senha_hash = bcrypt.hashSync(senha, 10);

    let inserted;
    try {
      [inserted] = await db.insert(users).values({ nome, email, senhaHash: senha_hash }).returning();
    } catch (err) {
      if ((err.cause ?? err).code === UNIQUE_VIOLATION) {
        return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail' });
      }
      throw err;
    }

    const user = { id: inserted.id, nome: inserted.nome, email: inserted.email };
    res.status(201).json({ token: signToken(user), user });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, senha } = req.body ?? {};
    if (!email || !senha) return res.status(400).json({ erro: 'Preencha e-mail e senha' });

    const [row] = await db.select().from(users).where(eq(users.email, email));
    if (!row || !bcrypt.compareSync(senha, row.senhaHash)) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
    }
    const user = { id: row.id, nome: row.nome, email: row.email };
    res.json({ token: signToken(user), user });
  })
);
