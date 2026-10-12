import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Topico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [topico, setTopico] = useState(null);
  const [temQuestoes, setTemQuestoes] = useState(null);
  const [fase, setFase] = useState('conteudo'); // conteudo | quiz | resultado
  const [erro, setErro] = useState('');

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
      .catch(() => setTemQuestoes(false));
  }, [id]);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
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
          <button
            onClick={() => setFase('quiz')}
            disabled={!temQuestoes}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            Fazer quiz
          </button>
        </div>
      </div>
    );
  }

  return null;
}
