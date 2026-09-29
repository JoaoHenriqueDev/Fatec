import { Router } from 'express';
import { redacoes } from '../data.js';
import { requireAuth } from '../middleware/auth.js';

export const router = Router();

router.get('/redacoes', requireAuth, (_req, res) => {
  res.json(redacoes);
});
