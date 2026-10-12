import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const STATUS_STYLE = {
  nao_iniciado: 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
  reprovado: 'bg-amber-400 text-amber-950',
  aprovado: 'bg-green-500 text-white',
};

const STATUS_LABEL = {
  nao_iniciado: 'Não iniciado',
  reprovado: 'Reprovado — tente de novo',
  aprovado: 'Aprovado',
};

export default function Trilha() {
  const [topicos, setTopicos] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.getTrilha().then(setTopicos).catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!topicos) return <p className="text-slate-500">Carregando...</p>;

  const porMateria = new Map();
  for (const t of topicos) {
    if (!porMateria.has(t.materia)) porMateria.set(t.materia, []);
    porMateria.get(t.materia).push(t);
  }
  for (const lista of porMateria.values()) lista.sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Trilha de estudos</h1>
      {[...porMateria.entries()].map(([materia, lista]) => (
        <div key={materia} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="font-bold mb-3">{materia}</h2>
          <div className="flex flex-wrap gap-3">
            {lista.map((t) => (
              <Link
                key={t.id}
                to={`/app/trilha/${t.id}`}
                className="flex flex-col items-center gap-1.5 w-24 text-center group"
              >
                <span
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${STATUS_STYLE[t.status]} group-hover:opacity-80`}
                  title={STATUS_LABEL[t.status]}
                >
                  {t.status === 'aprovado' ? '✓' : t.ordem}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">{t.nome}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
