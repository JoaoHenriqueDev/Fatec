import { execFileSync } from 'node:child_process';
import * as mupdfns from 'mupdf';

const mupdf = mupdfns.default ?? mupdfns;

// Texto puro em ordem de leitura correta (testado: preserva a ordem certa mesmo em
// provas de 2 colunas com imagens no meio). NÃO usar -layout, que embaralha essas páginas.
export function extractPlainText(pdfPath) {
  return execFileSync(
    'pdftotext',
    ['-enc', 'UTF-8', pdfPath, '-'],
    { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }
  );
}

export class PdfDoc {
  constructor(pdfPath) {
    this.path = pdfPath;
    this.doc = mupdf.Document.openDocument(pdfPath);
    this.pageCount = this.doc.countPages();
  }

  // Blocos de texto e imagem de uma página, com bbox em coordenadas da página (pt).
  // A ordem NÃO é necessariamente a ordem de leitura (é ordem do content stream).
  getPageBlocks(pageIndex) {
    const page = this.doc.loadPage(pageIndex);
    const bounds = page.getBounds();
    const st = page.toStructuredText('preserve-images');
    const json = JSON.parse(st.asJSON());
    const text = [];
    const images = [];
    for (const b of json.blocks) {
      if (b.type === 'image') {
        images.push({ page: pageIndex, x: b.bbox.x, y: b.bbox.y, w: b.bbox.w, h: b.bbox.h });
      } else if (b.type === 'text') {
        const lineTexts = b.lines.map((l) => l.text.trim()).filter(Boolean);
        const lineText = lineTexts.join(' ').trim();
        if (lineText) {
          text.push({ page: pageIndex, x: b.bbox.x, y: b.bbox.y, w: b.bbox.w, h: b.bbox.h, text: lineText, lineTexts });
        }
      }
    }
    return { text, images, width: bounds[2] - bounds[0], height: bounds[3] - bounds[1] };
  }

  getAllBlocks() {
    const pages = [];
    for (let i = 0; i < this.pageCount; i++) pages.push(this.getPageBlocks(i));
    return pages;
  }

  // Renderiza a página inteira em PNG num DPI alvo, devolve {buffer, scale} onde
  // scale converte coordenadas de página (pt, 72dpi) para pixels da imagem renderizada.
  renderPagePNG(pageIndex, dpi = 200) {
    const page = this.doc.loadPage(pageIndex);
    const scale = dpi / 72;
    const matrix = mupdf.Matrix.scale(scale, scale);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
    const buffer = Buffer.from(pixmap.asPNG());
    return { buffer, scale };
  }
}
