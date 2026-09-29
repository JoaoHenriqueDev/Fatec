const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function QuestionCard({ questao, selected, onSelect, showCorrection, disabled }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {questao.ano}/{questao.semestre}º sem — Questão {questao.numero}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {questao.materia ?? 'Sem matéria'}
        </span>
      </div>

      {questao.anulada && (
        <div className="text-sm px-3 py-2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Questão anulada pela banca — qualquer resposta é considerada correta.
        </div>
      )}

      {questao.textoApoio && (
        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line border-l-2 border-slate-300 dark:border-slate-700 pl-3">
          {questao.textoApoio}
        </p>
      )}

      <p className="whitespace-pre-line leading-relaxed">{questao.enunciado}</p>

      {questao.imagens?.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {questao.imagens.map((src) => (
            <img key={src} src={src} alt="" className="max-w-full sm:max-w-sm rounded-lg border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {LETTERS.map((letter) => {
          const texto = questao.alternativas?.[letter];
          if (!texto) return null;
          const isSelected = selected === letter;
          const isCorrect = questao.correta === letter;

          let stateClass = 'border-slate-200 dark:border-slate-700 hover:border-blue-400';
          if (showCorrection) {
            if (isCorrect) stateClass = 'border-green-500 bg-green-50 dark:bg-green-900/20';
            else if (isSelected && !isCorrect) stateClass = 'border-red-500 bg-red-50 dark:bg-red-900/20';
          } else if (isSelected) {
            stateClass = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
          }

          return (
            <button
              key={letter}
              disabled={disabled}
              onClick={() => onSelect(letter)}
              className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors disabled:cursor-default ${stateClass}`}
            >
              <span className="font-semibold mr-2">{letter})</span>
              <span className="whitespace-pre-line">{texto}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
