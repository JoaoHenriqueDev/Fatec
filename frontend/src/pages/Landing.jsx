import { Link } from 'react-router-dom';

const FEATURES = [
  { titulo: 'Questões por matéria', desc: 'Pratique por matéria, ano e semestre, com correção imediata a cada resposta.' },
  { titulo: 'Simulados completos', desc: 'Refaça provas inteiras com cronômetro e navegação entre questões, como no dia da prova.' },
  { titulo: 'Painel de desempenho', desc: 'Acompanhe sua evolução, acerto por matéria e identifique seus pontos fortes e fracos.' },
  { titulo: 'Temas de redação', desc: 'Veja os temas de redação cobrados em cada edição do vestibular.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <span className="font-bold text-lg text-blue-600">FATEC Estudos</span>
        <div className="flex gap-2">
          <Link to="/login" className="px-4 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
            Entrar
          </Link>
          <Link to="/cadastro" className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
            Cadastrar
          </Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Estude com as provas reais do vestibular da FATEC
        </h1>
        <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Questões de 2017 a 2026, organizadas por matéria, com correção imediata, simulados
          cronometrados e um painel que mostra exatamente onde você precisa melhorar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/cadastro" className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            Começar agora — é grátis
          </Link>
          <Link to="/login" className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-20 grid sm:grid-cols-2 gap-5">
        {FEATURES.map((f) => (
          <div key={f.titulo} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3 className="font-semibold text-lg mb-1">{f.titulo}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
