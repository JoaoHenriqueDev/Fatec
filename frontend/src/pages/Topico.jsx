import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import QuestionCard from '../components/QuestionCard.jsx';

const SEM_QUESTOES = 'Ainda não há questões cadastradas para este tópico';

export default function Topico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [topico, setTopico] = useState(null);
  const [temQuestoes, setTemQuestoes] = useState(null);
  const [fase, setFase] = useState('conteudo'); // conteudo | quiz | resultado
  const [erro, setErro] = useState('');
  const [questoesQuiz, setQuestoesQuiz] = useState([]);
  const [index, setIndex] = useState(0);
  const [respostasQuiz, setRespostasQuiz] = useState({});
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    api
      .getTrilha()
      .then((lista) => {
        const encontrado = lista.find((t) => t.id === id);
        if (!encontrado) {
          setErro('Tópico não encontrado');
          return;
        }
        setTopico(encontrado);
      })
      .catch((e) => setErro(e.message));
  }, [id]);

  useEffect(() => {
    api
      .getQuizTopico(id)
      .then(() => setTemQuestoes(true))
      .catch((err) => {
        if (err.message === SEM_QUESTOES) {
          setTemQuestoes(false);
        } else {
          setErro(err.message);
        }
      });
  }, [id]);

  async function iniciarQuiz() {
    setLoading(true);
    setErro('');
    try {
      const qs = await api.getQuizTopico(id);
      setQuestoesQuiz(qs);
      setIndex(0);
      setRespostasQuiz({});
      setFase('quiz');
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  function selecionarResposta(letra) {
    setRespostasQuiz((prev) => ({ ...prev, [questoesQuiz[index].id]: letra }));
  }

  async function finalizarQuiz() {
    setLoading(true);
    setErro('');
    try {
      const r = await api.postQuizTopico(id, respostasQuiz);
      setResultado(r);
      setFase('resultado');
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (erro && !topico) return <p className="text-sm text-red-600">{erro}</p>;
  if (!topico) return <p className="text-slate-500">Carregando...</p>;

  if (fase === 'conteudo') {
    return (
      <div className="space-y-6">
        <Link to="/app/trilha" className="text-sm text-blue-600">
          ← Voltar pra trilha
        </Link>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">{topico.materia}</span>
          <h1 className="text-xl font-bold">{topico.nome}</h1>
          <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{topico.conteudo}</p>
          <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <iframe
              src={topico.videoUrl}
              title={topico.nome}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
          {temQuestoes === false && (
            <p className="text-sm px-3 py-2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Ainda não há questões cadastradas para este tópico — volte em breve.
            </p>
          )}
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button
            onClick={iniciarQuiz}
            disabled={!temQuestoes || loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Preparando...' : 'Fazer quiz'}
          </button>
        </div>
      </div>
    );
  }

  if (fase === 'quiz') {
    const atual = questoesQuiz[index];
    if (!atual) return null;
    const respondidas = Object.keys(respostasQuiz).length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Questão {index + 1} de {questoesQuiz.length}
          </span>
          <span>{respondidas}/{questoesQuiz.length} respondidas</span>
          <button
            onClick={finalizarQuiz}
            disabled={loading}
            className="px-4 py-1.5 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Finalizar quiz'}
          </button>
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
            onClick={() => setIndex((i) => Math.min(questoesQuiz.length - 1, i + 1))}
            disabled={index === questoesQuiz.length - 1}
            className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>

        <QuestionCard questao={atual} selected={respostasQuiz[atual.id]} onSelect={selecionarResposta} showCorrection={false} disabled={false} />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>
    );
  }

  const { acertos, total, emBranco, aprovado, melhorAcertos, tentativas, questoes: corrigidas } = resultado;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
        <h1 className="text-xl font-bold mb-1">{aprovado ? 'Aprovado!' : 'Reprovado — tente de novo'}</h1>
        <p className="text-4xl font-extrabold text-blue-600 my-3">
          {acertos}/{total}
        </p>
        {emBranco > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">Você deixou {emBranco} questão(ões) em branco.</p>
        )}
        <p className="text-slate-500 dark:text-slate-400">
          Melhor resultado: {melhorAcertos}/{total} · {tentativas} tentativa(s)
        </p>
        {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
      </div>

      <h2 className="font-bold">Gabarito</h2>
      <div className="space-y-4">
        {corrigidas.map((q) => (
          <QuestionCard key={q.id} questao={q} selected={respostasQuiz[q.id]} onSelect={() => {}} showCorrection disabled />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={iniciarQuiz}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Preparando...' : 'Tentar de novo'}
        </button>
        <button
          onClick={() => navigate('/app/trilha')}
          className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          Voltar pra trilha
        </button>
      </div>
    </div>
  );
}
