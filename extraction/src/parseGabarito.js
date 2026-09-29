import { PdfDoc } from './pdf.js';
import { mapSubject } from './subjects.js';

const LETTER_RE = /^[A-E]$/;
// Gabaritos retificados às vezes anotam a célula da alternativa, ex: "C - Retificada".
const LETTER_WITH_NOTE_RE = /^([A-E])\s*-\s*(.+)$/;

// Uma linha de tabela do gabarito, depois de reconstruída pelo mupdf, sempre vem como
// um único bloco de texto com células separadas por "|", contendo 1 ou 2 grupos
// [questão, alternativa-ou-ANULADA, disciplina] lado a lado (tabela em 2 colunas visuais).
// Validado manualmente em amostras de 2017 a 2026 (formatos variam mas essa estrutura
// de bloco se mantém em todos).
function parseRowBlock(lineTexts) {
  const cells = lineTexts.map((c) => c.trim()).filter((c) => c.length > 0);
  const entries = [];
  for (let i = 0; i + 2 < cells.length; i += 3) {
    const [numRaw, altRaw, discRaw] = [cells[i], cells[i + 1], cells[i + 2]];
    if (!/^\d+$/.test(numRaw)) continue;
    entries.push({ numero: parseInt(numRaw, 10), altRaw, discRaw });
  }
  return entries;
}

export function parseGabarito(pdfPath) {
  const doc = new PdfDoc(pdfPath);
  const byQuestion = new Map();
  const warnings = [];

  for (let p = 0; p < doc.pageCount; p++) {
    const { text } = doc.getPageBlocks(p);
    for (const block of text) {
      if (block.lineTexts.length < 3) continue;
      const entries = parseRowBlock(block.lineTexts);
      for (const { numero, altRaw, discRaw } of entries) {
        const altIsAnulada = /^ANULADA$/i.test(altRaw);
        const discIsAnulada = /^ANULADA$/i.test(discRaw);
        const anulada = altIsAnulada || discIsAnulada;

        let correta = null;
        let notaRetificacao = null;
        if (!anulada) {
          if (LETTER_RE.test(altRaw)) {
            correta = altRaw;
          } else {
            const m = altRaw.match(LETTER_WITH_NOTE_RE);
            if (m) {
              correta = m[1];
              notaRetificacao = m[2].trim();
            }
          }
        }

        let materia = null;
        if (!discIsAnulada) materia = mapSubject(discRaw);

        if (!anulada && correta === null) {
          warnings.push(`questão ${numero}: alternativa não reconhecida ("${altRaw}")`);
        }
        if (!anulada && materia === null) {
          warnings.push(`questão ${numero}: disciplina não reconhecida ("${discRaw}")`);
        }

        byQuestion.set(numero, { numero, correta, materia, anulada, notaRetificacao });
      }
    }
  }

  return { entries: byQuestion, warnings, totalEncontradas: byQuestion.size };
}
