import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PdfDoc } from './pdf.js';

const HEADING_RE = /^Quest[ãa]o\s+0*(\d+)\b/;
const SHARED_RE = /Leia[^.]{0,150}?para responder[^.]{0,60}?quest(?:ão|ões)\s+([0-9,\se]+?)\./i;
const ESSAY_RE = /^((PROPOSTA|TEMA) DE )?REDA[ÇC][AÃ]O$/i;
const MIN_IMAGE_AREA = 400; // pt^2 - ignora bolinhas/decoração (ex: marcador de alternativa)
// Ícone/numeração de página no rodapé: pequeno E colado na borda inferior. As duas condições
// precisam valer juntas, senão figuras grandes que apenas chegam perto do rodapé seriam cortadas.
const FOOTER_ICON_ZONE = 45; // pt a partir da borda inferior
const FOOTER_ICON_MAX_AREA = 2000; // pt^2

function parseNumeros(raw) {
  const rangeMatch = raw.match(/(\d+)\s*a\s*(\d+)/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10), b = parseInt(rangeMatch[2], 10);
    const out = [];
    for (let n = a; n <= b; n++) out.push(n);
    return out;
  }
  return [...raw.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
}

// Associa cada imagem embutida à questão mais provável, usando as posições (bbox) dadas
// pelo mupdf. Heurística (melhor esforço, não é garantia de 100% de acerto - ver relatório):
//  1) se a imagem está na mesma página de um marcador "Leia ... para responder às
//     questões X e Y", ela é anexada a TODAS as questões referenciadas por esse marcador
//     (cobre o caso comum de gráfico/tirinha compartilhado entre 2+ questões);
//  2) senão, é anexada à questão mais próxima que a precede na mesma coluna da página.
export function associateImages(pages) {
  const headings = [];
  const sharedMarkers = [];
  const images = [];
  let essayBoundary = null; // {page, y} - nada depois disso pertence a uma questão

  pages.forEach((pg, pageIndex) => {
    for (const b of pg.text) {
      const hMatch = b.text.match(HEADING_RE);
      if (hMatch) headings.push({ numero: parseInt(hMatch[1], 10), page: pageIndex, x: b.x, y: b.y });
      const sMatch = b.text.match(SHARED_RE);
      if (sMatch) sharedMarkers.push({ numeros: parseNumeros(sMatch[1]), page: pageIndex, x: b.x, y: b.y });
      if (!essayBoundary && ESSAY_RE.test(b.text.trim())) essayBoundary = { page: pageIndex, y: b.y };
    }
    for (const img of pg.images) {
      if (img.w <= 0 || img.h <= 0) continue; // bbox inválido (raro, artefato do mupdf)
      const area = img.w * img.h;
      if (area < MIN_IMAGE_AREA) continue;
      const nearBottom = pg.height && img.y + img.h > pg.height - FOOTER_ICON_ZONE;
      if (nearBottom && area < FOOTER_ICON_MAX_AREA) continue; // ícone/rodapé repetido em toda página
      images.push({ ...img, page: pageIndex, width: pg.width, height: pg.height });
    }
  });

  const beforeEssay = (page, y) => {
    if (!essayBoundary) return true;
    if (page < essayBoundary.page) return true;
    if (page > essayBoundary.page) return false;
    return y < essayBoundary.y;
  };
  const headingsInScope = headings.filter((h) => beforeEssay(h.page, h.y));
  const imagesInScope = images.filter((img) => beforeEssay(img.page, img.y));

  const byQuestion = new Map();
  const addTo = (numero, entry) => {
    if (!byQuestion.has(numero)) byQuestion.set(numero, []);
    byQuestion.get(numero).push(entry);
  };

  for (const img of imagesInScope) {
    const samePageMarkers = sharedMarkers.filter((m) => m.page === img.page);
    if (samePageMarkers.length > 0) {
      const nearest = samePageMarkers.reduce((best, m) =>
        Math.abs(m.y - img.y) < Math.abs(best.y - img.y) ? m : best
      );
      for (const numero of nearest.numeros) addTo(numero, img);
      continue;
    }

    const threshold = (img.width ?? 600) / 2;
    const imgCenterX = img.x + img.w / 2;
    const imgColumn = imgCenterX < threshold ? 'L' : 'R';
    const candidates = headingsInScope.filter((h) => {
      if (h.page > img.page) return false;
      if (h.page < img.page) return true;
      const hColumn = h.x < threshold ? 'L' : 'R';
      return hColumn === imgColumn && h.y <= img.y + 40;
    });
    if (candidates.length === 0) {
      // sem coluna compatível: pega o cabeçalho anterior mais próximo, de qualquer coluna
      const anyPrev = headingsInScope.filter((h) => h.page < img.page || (h.page === img.page && h.y <= img.y + 40));
      if (anyPrev.length === 0) continue;
      const nearest = anyPrev.reduce((best, h) => (h.page > best.page || (h.page === best.page && h.y > best.y) ? h : best));
      addTo(nearest.numero, img);
      continue;
    }
    const nearest = candidates.reduce((best, h) => (h.page > best.page || (h.page === best.page && h.y > best.y) ? h : best));
    addTo(nearest.numero, img);
  }

  return byQuestion;
}

// Recorta e salva as imagens de uma prova. Retorna Map<numero, string[]> (caminhos
// relativos a partir de /assets, prontos para usar em frontend/public/assets/...).
export async function cropQuestionImages(pdfPath, outDir, assetPrefix) {
  const doc = new PdfDoc(pdfPath);
  const pages = doc.getAllBlocks();
  const byQuestion = associateImages(pages);

  fs.mkdirSync(outDir, { recursive: true });
  const result = new Map();
  const pageCache = new Map();

  for (const [numero, imgs] of byQuestion.entries()) {
    const paths = [];
    for (let k = 0; k < imgs.length; k++) {
      const img = imgs[k];
      if (!pageCache.has(img.page)) pageCache.set(img.page, doc.renderPagePNG(img.page, 200));
      const { buffer, scale } = pageCache.get(img.page);
      const left = Math.max(0, Math.round(img.x * scale));
      const top = Math.max(0, Math.round(img.y * scale));
      const width = Math.max(1, Math.round(img.w * scale));
      const height = Math.max(1, Math.round(img.h * scale));
      const fileName = imgs.length > 1 ? `q${String(numero).padStart(2, '0')}-${k + 1}.png` : `q${String(numero).padStart(2, '0')}.png`;
      const outPath = path.join(outDir, fileName);
      await sharp(buffer).extract({ left, top, width, height }).toFile(outPath);
      paths.push(`${assetPrefix}/${fileName}`);
    }
    result.set(numero, paths);
  }
  return result;
}
