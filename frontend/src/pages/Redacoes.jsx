import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Redacoes() {
  const [redacoes, setRedacoes] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.getRedacoes().then(setRedacoes).catch((e) => setErro(e.message));
  }, []);

  const ordenadas = [...redacoes].sort((a, b) => b.ano - a.ano || b.semestre - a.semestre);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Temas de redação</h1>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {ordenadas.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {r.ano} — {r.semestre}º semestre
            </span>
            <p className="mt-1 font-medium">{r.tema}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
