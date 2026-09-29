import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import QuestionCard from '../components/QuestionCard.jsx';

function formatTempo(segundos) {
  const h = String(Math.floor(segundos / 3600)).padStart(2, '0');
  const m = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0');
  const s = String(segundos % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function Simulado() {
  const [provas, setProvas] = useState([]);
  const [selecionada, setSelecionada] = useState('');
  const [fase, setFase] = useState('selecionando'); // selecionando | rodando | finalizado
  const [simulado, setSimulado] = useState(null);
  const [questoes, setQuestoes] = useState([]);
  const [index, setIndex] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [tempo, setTempo] = useState(0);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    api.getProvas().then(setProvas).catch(() => {});
  }, []);

  useEffect(() => {
    if (fase !== 'rodando') return;
    timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [fase]);

  async function iniciar() {
    if (!selecionada) return;
    const [ano, semestre] = selecionada.split('-').map(Number);
    setLoading(true);
    setErro('');
    try {
      const [novoSimulado, todasQuestoes] = await Promise.all([
        api.postSimulado({ ano, semestre }),
        api.getQuestoes({ ano, semestre }),
      ]);
      setSimulado(novoSimulado);
      setQuestoes(todasQuestoes.sort((a, b) => a.numero - b.numero));
      setIndex(0);
      setRespostas({});
      setTempo(0);
      setFase('rodando');
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  function selecionarResposta(letra) {
    setRespostas((prev) => ({ ...prev, [questoes[index].id]: letra }));
  }

  async function finalizar() {
    clearInterval(timerRef.current);
    setLoading(true);
    setErro('');
    try {
      await Promise.all(
        Object.entries(respostas).map(([questao_id, resposta]) =>
          api.postResposta({ questao_id, resposta, modo: 'simulado', simulado_id: simulado.id })
        )
      );
      const atualizado = await api.finalizarSimulado(simulado.id);

      const porMateria = {};
      for (const q of questoes) {
        const materia = q.materia ?? 'Interdisciplinar';
        porMateria[materia] ??= { acertos: 0, total: 0 };
        porMateria[materia].total++;
        const resposta = respostas[q.id];
        const correta = q.anulada || resposta === q.correta;
        if (correta) porMateria[materia].acertos++;
      }

      setResultado({ simulado: atualizado, porMateria });
      setFase('finalizado');
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (fase === 'selecionando') {
    return (
      <div className="max-w-lg mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h1 className="text-xl font-bold">Simulado completo</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Escolha uma prova para responder todas as questões com cronômetro, como no dia do vestibular.
        </p>
        <select value={selecionada} onChange={(e) => setSelecionada(e.target.value)} className="input">
          <option value="">Selecione ano/semestre</option>
          {provas.map((p) => (
            <option key={`${p.ano}-${p.semestre}`} value={`${p.ano}-${p.semestre}`}>
              {p.ano} — {p.semestre}º semestre ({p.totalQuestoes} questões)
            </option>
          ))}
        </select>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button
          onClick={iniciar}
          disabled={!selecionada || loading}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Preparando...' : 'Iniciar simulado'}
        </button>
      </div>
    );
  }

  if (fase === 'rodando') {
    const atual = questoes[index];
    const respondidas = Object.keys(respostas).length;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
          <span className="font-mono text-lg">⏱ {formatTempo(tempo)}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {respondidas}/{questoes.length} respondidas
          </span>
          <button
            onClick={finalizar}
            disabled={loading}
            className="px-4 py-1.5 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? 'Finalizando...' : 'Finalizar simulado'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {questoes.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setIndex(i)}
              className={`w-8 h-8 rounded-md text-xs font-medium border ${
                i === index
                  ? 'bg-blue-600 text-white border-blue-600'
                  : respostas[q.id]
                  ? 'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-700'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {q.numero}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
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

        <QuestionCard questao={atual} selected={respostas[atual.id]} onSelect={selecionarResposta} showCorrection={false} disabled={false} />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>
    );
  }

  const { simulado: resumo, porMateria } = resultado;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
        <h1 className="text-xl font-bold mb-1">Simulado finalizado</h1>
        <p className="text-4xl font-extrabold text-blue-600 my-3">
          {resumo.acertos}/{resumo.total}
        </p>
        <p className="text-slate-500 dark:text-slate-400">{Math.round((resumo.acertos / resumo.total) * 100)}% de aproveitamento</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="font-bold mb-3">Desempenho por matéria</h2>
        <div className="space-y-2">
          {Object.entries(porMateria).map(([materia, s]) => (
            <div key={materia} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0">{materia}</span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${(s.acertos / s.total) * 100}%` }} />
              </div>
              <span className="w-12 text-right text-slate-500 dark:text-slate-400">
                {s.acertos}/{s.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="font-bold">Gabarito completo</h2>
      <div className="space-y-4">
        {questoes.map((q) => (
          <QuestionCard key={q.id} questao={q} selected={respostas[q.id]} onSelect={() => {}} showCorrection disabled />
        ))}
      </div>

      <button
        onClick={() => setFase('selecionando')}
        className="w-full py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Fazer outro simulado
      </button>
    </div>
  );
}
