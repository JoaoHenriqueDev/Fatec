import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { SUBJECTS } from '../subjects.js';
import QuestionCard from '../components/QuestionCard.jsx';

export default function Questoes() {
  const [materias, setMaterias] = useState([]);
  const [ano, setAno] = useState('');
  const [semestre, setSemestre] = useState('');
  const [provas, setProvas] = useState([]);

  const [questoes, setQuestoes] = useState(null);
  const [index, setIndex] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.getProvas().then(setProvas).catch(() => {});
  }, []);

  function toggleMateria(m) {
    setMaterias((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function buscar() {
    setLoading(true);
    setErro('');
    try {
      const params = {};
      if (materias.length) params.materias = materias.join(',');
      if (ano) params.ano = ano;
      if (semestre) params.semestre = semestre;
      const data = await api.getQuestoes(params);
      setQuestoes(data);
      setIndex(0);
      setRespostas({});
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function responder(letra) {
    const questao = questoes[index];
    if (respostas[questao.id]) return;
    setRespostas((prev) => ({ ...prev, [questao.id]: letra }));
    try {
      await api.postResposta({ questao_id: questao.id, resposta: letra, modo: 'pratica' });
    } catch {
      // resposta local já foi registrada visualmente; falha ao salvar não trava o estudo
    }
  }

  const anos = [...new Set(provas.map((p) => p.ano))].sort((a, b) => b - a);
  const atual = questoes?.[index];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <h2 className="font-bold text-lg">Filtrar questões</h2>
        <div>
          <p className="text-sm font-medium mb-2">Matérias (opcional — deixe vazio para todas)</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((m) => (
              <button
                key={m}
                onClick={() => toggleMateria(m)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  materias.includes(m)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={ano} onChange={(e) => setAno(e.target.value)} className="input w-auto">
            <option value="">Todos os anos</option>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select value={semestre} onChange={(e) => setSemestre(e.target.value)} className="input w-auto">
            <option value="">Todos os semestres</option>
            <option value="1">1º semestre</option>
            <option value="2">2º semestre</option>
          </select>
          <button onClick={buscar} disabled={loading} className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Buscando...' : 'Buscar questões'}
          </button>
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>

      {questoes && questoes.length === 0 && (
        <p className="text-center text-slate-500 py-8">Nenhuma questão encontrada com esses filtros.</p>
      )}

      {atual && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              Questão {index + 1} de {questoes.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setIndex((i) => Math.min(questoes.length - 1, i + 1))}
                disabled={index === questoes.length - 1}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          </div>
          <QuestionCard
            questao={atual}
            selected={respostas[atual.id]}
            onSelect={responder}
            showCorrection={!!respostas[atual.id]}
            disabled={!!respostas[atual.id]}
          />
        </div>
      )}
    </div>
  );
}
