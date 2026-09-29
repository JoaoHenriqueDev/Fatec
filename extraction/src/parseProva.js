import { extractPlainText } from './pdf.js';

const HEADING_RE = /Quest[ãa]o\s+0*(\d+)\b/g;
const ESSAY_HEADING_RE = /\n[ \t]*((PROPOSTA|TEMA) DE )?REDA[ÇC][AÃ]O[ \t]*\r?\n/i;
const THEME_RE = /(?:explorando|sobre|desenvolvendo)\s+o\s+seguinte\s+tema[:\s]*\r?\n?\s*([^\n\r]{1,300})/i;
// "Leia o texto/a tirinha/o gráfico ... para responder à(s) questão(ões) N [e/,] M ..."
const SHARED_PASSAGE_RE = /Leia[^.\n]{0,150}?para responder[^.\n]{0,60}?quest(?:ão|ões)\s+([0-9,\se]+?)\./gi;
const FOOTER_RE = /VESTIBULAR\s+\d.{0,6}SEM\/\d{4}/i;
// cabeçalhos decorativos de seção com letras espaçadas, ex: "M U LT I D I S C I P L I N A R"
const SPACED_HEADING_RE = /^(?:[A-ZÀ-Ú]{1,2}\s+){3,}[A-ZÀ-Ú]{1,2}$/;
const ALT_MARK_RE = /\(([A-E])\)\s*/g;

function stripFooters(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => !(line.length < 70 && FOOTER_RE.test(line)))
    .filter((line) => !SPACED_HEADING_RE.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function parseQuestionNumbers(raw) {
  // "18 e 19" | "18, 19 e 20" | "18 a 20" | "18"
  const rangeMatch = raw.match(/(\d+)\s*a\s*(\d+)/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    const out = [];
    for (let n = a; n <= b; n++) out.push(n);
    return out;
  }
  return [...raw.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
}

function splitAlternatives(segmentText) {
  const marks = [...segmentText.matchAll(ALT_MARK_RE)];
  if (marks.length === 0) return { preamble: segmentText.trim(), alternativas: {}, letters: [] };
  const preamble = segmentText.slice(0, marks[0].index).trim();
  const alternativas = {};
  const letters = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index + marks[i][0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : segmentText.length;
    const letter = marks[i][1];
    const content = segmentText.slice(start, end).trim().replace(/\s+/g, ' ');
    alternativas[letter] = content;
    letters.push(letter);
  }
  return { preamble, alternativas, letters };
}

export function parseProva(pdfPath) {
  const raw = stripFooters(extractPlainText(pdfPath));
  const warnings = [];

  // 1. tema da redação
  const themeMatch = raw.match(THEME_RE);
  const temaRedacao = themeMatch ? themeMatch[1].trim().replace(/\r$/, '') : null;
  if (!temaRedacao) warnings.push('tema da redação não encontrado');

  // 2. limite: onde a seção de redação começa (corta a última questão ali)
  const essayMatch = raw.match(ESSAY_HEADING_RE);
  const essayStart = essayMatch ? essayMatch.index : raw.length;

  // 3. marcadores de texto de apoio compartilhado ("Leia ... para responder às questões X e Y")
  const sharedPassages = [...raw.matchAll(SHARED_PASSAGE_RE)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    numeros: parseQuestionNumbers(m[1]),
    texto: m[0].trim().replace(/\s+/g, ' '),
  }));

  // 4. cabeçalhos "Questão N"
  const headings = [...raw.matchAll(HEADING_RE)].map((m) => ({
    numero: parseInt(m[1], 10),
    start: m.index,
    contentStart: m.index + m[0].length,
  }));

  const questoes = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    let segEnd = i + 1 < headings.length ? headings[i + 1].start : essayStart;

    // se um marcador de passagem compartilhada cai dentro deste segmento (tipicamente
    // logo antes do cabeçalho da PRÓXIMA questão), corta o segmento ali - esse texto
    // pertence à(s) questão(ões) que ele referencia, não a esta.
    const sharedInside = sharedPassages.find((sp) => sp.start >= h.contentStart && sp.end <= segEnd);
    if (sharedInside) segEnd = sharedInside.start;

    const segmentText = raw.slice(h.contentStart, segEnd).trim();
    const { preamble, alternativas, letters } = splitAlternatives(segmentText);

    questoes.push({
      numero: h.numero,
      enunciado: preamble || '[ILEGÍVEL]',
      textoApoio: '',
      alternativas: {
        A: alternativas.A ?? '[ILEGÍVEL]',
        B: alternativas.B ?? '[ILEGÍVEL]',
        C: alternativas.C ?? '[ILEGÍVEL]',
        D: alternativas.D ?? '[ILEGÍVEL]',
        E: alternativas.E ?? '[ILEGÍVEL]',
      },
      _completude: letters.length,
    });
  }

  // Corrige cabeçalhos "Questão N" duplicados (glitch pontual de extração de PDF visto
  // em pelo menos um caderno: um número de questão aparece 2x seguidas, uma cópia vazia
  // e outra com conteúdo real). Mantém a versão mais completa, descarta a outra.
  const byNumero = new Map();
  for (const q of questoes) {
    const prev = byNumero.get(q.numero);
    if (!prev || q._completude > prev._completude) byNumero.set(q.numero, q);
  }
  if (byNumero.size !== questoes.length) {
    warnings.push(`${questoes.length - byNumero.size} cabeçalho(s) de questão duplicado(s) descartado(s) (mantida a versão mais completa)`);
  }
  const questoesFinal = [...byNumero.values()].sort((a, b) => a.numero - b.numero);
  for (const q of questoesFinal) {
    const missing = ['A', 'B', 'C', 'D', 'E'].filter((l) => q.alternativas[l] === '[ILEGÍVEL]');
    if (missing.length > 0) {
      warnings.push(`questão ${q.numero}: alternativa(s) ausente(s) [${missing.join(',')}]`);
    }
    if (q.enunciado === '[ILEGÍVEL]') {
      warnings.push(`questão ${q.numero}: enunciado não encontrado`);
    }
    delete q._completude;
  }

  // 5. injeta o texto de apoio compartilhado nas questões referenciadas
  for (const sp of sharedPassages) {
    for (const numero of sp.numeros) {
      const q = questoesFinal.find((qq) => qq.numero === numero);
      if (q) q.textoApoio = q.textoApoio ? `${q.textoApoio}\n${sp.texto}` : sp.texto;
    }
  }

  return { questoes: questoesFinal, temaRedacao, warnings, sharedPassages, totalEncontradas: questoesFinal.length };
}
