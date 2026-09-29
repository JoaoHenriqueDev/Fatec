import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '../api/client.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.getEstatisticas().then(setStats).catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!stats) return <p className="text-slate-500">Carregando...</p>;

  if (stats.geral.total === 0) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        <p className="text-lg font-medium mb-1">Você ainda não respondeu nenhuma questão.</p>
        <p>Vá em "Questões" ou "Simulado" para começar a praticar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Painel de desempenho</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card titulo="Aproveitamento geral" valor={`${stats.geral.percentual}%`} sub={`${stats.geral.acertos}/${stats.geral.total} questões`} />
        <Card titulo="Matéria mais forte" valor={stats.maisForte?.materia ?? '—'} sub={stats.maisForte ? `${stats.maisForte.percentual}% de acerto` : ''} tone="green" />
        <Card titulo="Matéria mais fraca" valor={stats.maisFraca?.materia ?? '—'} sub={stats.maisFraca ? `${stats.maisFraca.percentual}% de acerto` : ''} tone="red" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="font-bold mb-4">Acerto por matéria</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.porMateria} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis dataKey="materia" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="percentual" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="font-bold mb-4">Evolução ao longo do tempo</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={stats.evolucao} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis dataKey="data" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line type="monotone" dataKey="percentual" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="font-bold mb-4">Histórico de simulados</h2>
        {stats.historicoSimulados.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum simulado finalizado ainda.</p>
        ) : (
          <div className="space-y-2">
            {stats.historicoSimulados.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-800 py-2 last:border-0">
                <span>
                  {s.ano} — {s.semestre}º semestre
                </span>
                <span className="text-slate-500 dark:text-slate-400">{new Date(s.fim).toLocaleDateString('pt-BR')}</span>
                <span className="font-semibold">
                  {s.acertos}/{s.total} ({Math.round((s.acertos / s.total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ titulo, valor, sub, tone }) {
  const toneClass = tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-red-600' : 'text-blue-600';
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{titulo}</p>
      <p className={`text-2xl font-extrabold mt-1 ${toneClass}`}>{valor}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
