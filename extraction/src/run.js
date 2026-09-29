import fs from 'node:fs';
import path from 'node:path';
import { parseProva } from './parseProva.js';
import { parseGabarito } from './parseGabarito.js';
import { cropQuestionImages } from './cropImages.js';
import { buildRelatorio } from './validate.js';

const ROOT = path.resolve('..');
const PROVAS_DIR = path.join(ROOT, 'provas');
const FRONTEND_ASSETS = path.join(ROOT, 'frontend', 'public', 'assets');
const BACKEND_DATA = path.join(ROOT, 'backend', 'data');
const RELATORIO_PATH = path.join(ROOT, 'relatorio.md');

function findPdf(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (files.length === 0) throw new Error(`nenhum PDF encontrado em ${dir}`);
  return path.join(dir, files[0]);
}

async function processExam(ano, semestre, provaPdf, gabaritoPdf) {
  const { questoes: rawQuestoes, temaRedacao, warnings: provaWarnings } = parseProva(provaPdf);
  const { entries: gabaritoEntries, totalEncontradas: gabaritoTotal, warnings: gabWarnings } = parseGabarito(gabaritoPdf);

  const assetDir = `${ano}-${semestre}`;
  const outDir = path.join(FRONTEND_ASSETS, assetDir);
  const imagesByNumero = await cropQuestionImages(provaPdf, outDir, `/assets/${assetDir}`);

  const semGabarito = [];
  const ilegivel = [];
  const materiaDesconhecida = [];
  let anuladas = 0;
  let comImagem = 0;

  const questoes = rawQuestoes.map((q) => {
    const gab = gabaritoEntries.get(q.numero);
    if (!gab) semGabarito.push(q.numero);

    const temIlegivel =
      q.enunciado === '[ILEGÍVEL]' || Object.values(q.alternativas).some((a) => a === '[ILEGÍVEL]');
    if (temIlegivel) ilegivel.push(q.numero);

    if (gab && !gab.anulada && !gab.materia) materiaDesconhecida.push(q.numero);
    if (gab?.anulada) anuladas++;

    const imagens = imagesByNumero.get(q.numero) ?? [];
    if (imagens.length > 0) comImagem++;

    return {
      id: `${ano}-${semestre}-q${String(q.numero).padStart(2, '0')}`,
      ano,
      semestre,
      numero: q.numero,
      materia: gab?.materia ?? null,
      enunciado: q.enunciado,
      textoApoio: q.textoApoio,
      imagens,
      alternativas: q.alternativas,
      correta: gab?.anulada ? null : gab?.correta ?? null,
      anulada: gab?.anulada ?? false,
    };
  });

  const duplicatasDescartadas = provaWarnings.filter((w) => w.includes('duplicado')).length;

  const redacao = temaRedacao ? { id: `${ano}-${semestre}-redacao`, ano, semestre, tema: temaRedacao } : null;

  return {
    ano,
    semestre,
    questoes,
    redacao,
    temaRedacao,
    gabaritoTotal,
    semGabarito,
    ilegivel,
    materiaDesconhecida,
    anuladas,
    comImagem,
    duplicatasDescartadas,
    provaWarnings,
    gabWarnings,
  };
}

async function main() {
  const years = fs.readdirSync(PROVAS_DIR).filter((f) => fs.statSync(path.join(PROVAS_DIR, f)).isDirectory()).sort();

  const allQuestoes = [];
  const allRedacoes = [];
  const examResults = [];

  for (const year of years) {
    const yearPath = path.join(PROVAS_DIR, year);
    const sems = fs.readdirSync(yearPath).filter((f) => fs.statSync(path.join(yearPath, f)).isDirectory()).sort();
    const yearSummaries = [];

    for (const sem of sems) {
      const semNum = sem.trim().startsWith('1') ? 1 : 2;
      const provaDir = path.join(yearPath, sem, 'prova');
      const gabaritoDir = path.join(yearPath, sem, 'gabarito');
      if (!fs.existsSync(provaDir) || !fs.existsSync(gabaritoDir)) continue;

      const provaPdf = findPdf(provaDir);
      const gabaritoPdf = findPdf(gabaritoDir);

      const result = await processExam(parseInt(year, 10), semNum, provaPdf, gabaritoPdf);
      examResults.push(result);
      allQuestoes.push(...result.questoes);
      if (result.redacao) allRedacoes.push(result.redacao);

      yearSummaries.push(
        `  ${year}/${semNum}º sem: ${result.questoes.length} questões, ${result.anuladas} anuladas, ` +
        `${result.comImagem} com imagem, tema=${result.temaRedacao ? 'OK' : 'FALTA'}, ` +
        `pendências=${result.ilegivel.length + result.semGabarito.length + result.materiaDesconhecida.length}`
      );
    }

    console.log(`\n=== Ano ${year} concluído ===`);
    yearSummaries.forEach((l) => console.log(l));
  }

  fs.mkdirSync(BACKEND_DATA, { recursive: true });
  fs.writeFileSync(path.join(BACKEND_DATA, 'questoes.json'), JSON.stringify(allQuestoes, null, 2));
  fs.writeFileSync(path.join(BACKEND_DATA, 'redacoes.json'), JSON.stringify(allRedacoes, null, 2));
  fs.writeFileSync(RELATORIO_PATH, buildRelatorio(examResults));

  console.log(`\n=== Concluído ===`);
  console.log(`Total de provas: ${examResults.length}`);
  console.log(`Total de questões: ${allQuestoes.length}`);
  console.log(`Total de redações: ${allRedacoes.length}`);
  console.log(`Arquivos gerados:`);
  console.log(`  - ${path.join(BACKEND_DATA, 'questoes.json')}`);
  console.log(`  - ${path.join(BACKEND_DATA, 'redacoes.json')}`);
  console.log(`  - ${RELATORIO_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
