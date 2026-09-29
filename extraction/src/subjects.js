export const SUBJECTS = [
  'Português',
  'Literatura',
  'Inglês',
  'Matemática',
  'Física',
  'Química',
  'Biologia',
  'História',
  'Geografia',
  'Interdisciplinar',
];

// Nomes de disciplina como aparecem nos gabaritos oficiais da FATEC (várias grafias/anos)
// normalizados (maiúsculo, sem acento) -> enum do app.
const RAW_TO_SUBJECT = {
  'PORTUGUES': 'Português',
  'LITERATURA': 'Literatura',
  'INGLES': 'Inglês',
  'MATEMATICA': 'Matemática',
  'FISICA': 'Física',
  'QUIMICA': 'Química',
  'BIOLOGIA': 'Biologia',
  'HISTORIA': 'História',
  'GEOGRAFIA': 'Geografia',
  'MULTIDISCIPLINAR': 'Interdisciplinar',
  'INTERDISCIPLINAR': 'Interdisciplinar',
  // Raciocínio Lógico é uma disciplina própria da FATEC sem equivalente no enum pedido
  // pelo usuário -> mapeada para Interdisciplinar (decisão registrada no plano/relatório).
  'RACIOCINIO LOGICO': 'Interdisciplinar',
  'RAC LOGICO': 'Interdisciplinar',
  'RAC. LOGICO': 'Interdisciplinar',
};

function normalize(raw) {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// Retorna o enum de matéria, ou null se não reconhecido (nunca inventa uma matéria).
export function mapSubject(raw) {
  if (!raw) return null;
  const key = normalize(raw);
  return RAW_TO_SUBJECT[key] ?? null;
}
