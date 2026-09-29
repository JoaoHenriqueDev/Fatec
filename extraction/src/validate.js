export function buildRelatorio(examResults) {
  const lines = [];
  lines.push('# Relatório de extração — Provas FATEC');
  lines.push('');
  lines.push(`Gerado em ${new Date().toISOString()}`);
  lines.push('');

  let totalQuestoes = 0;
  let totalIlegivel = 0;
  let totalSemGabarito = 0;
  let totalAnuladas = 0;
  let totalComImagem = 0;
  let totalSemTema = 0;

  for (const r of examResults) {
    lines.push(`## ${r.ano}/${r.semestre}º semestre`);
    lines.push('');
    lines.push(`- Questões extraídas: ${r.questoes.length} (esperado pelo gabarito: ${r.gabaritoTotal})`);
    lines.push(`- Tema de redação: ${r.temaRedacao ? `"${r.temaRedacao}"` : '**NÃO ENCONTRADO**'}`);
    lines.push(`- Questões anuladas: ${r.anuladas}`);
    lines.push(`- Questões com imagem associada: ${r.comImagem}`);

    const problemas = [];
    if (r.semGabarito.length) problemas.push(`sem gabarito correspondente: [${r.semGabarito.join(', ')}]`);
    if (r.ilegivel.length) problemas.push(`com trecho [ILEGÍVEL] (enunciado/alternativa não extraído): [${r.ilegivel.join(', ')}]`);
    if (r.duplicatasDescartadas) problemas.push(`${r.duplicatasDescartadas} cabeçalho(s) de questão duplicado(s) descartado(s)`);
    if (r.materiaDesconhecida.length) problemas.push(`disciplina não reconhecida no gabarito: [${r.materiaDesconhecida.join(', ')}]`);
    if (!r.temaRedacao) problemas.push('tema de redação não encontrado');

    if (problemas.length === 0) {
      lines.push('- ✅ Nenhuma inconsistência encontrada.');
    } else {
      lines.push('- ⚠️ Inconsistências:');
      for (const p of problemas) lines.push(`  - ${p}`);
    }
    lines.push('');

    totalQuestoes += r.questoes.length;
    totalIlegivel += r.ilegivel.length;
    totalSemGabarito += r.semGabarito.length;
    totalAnuladas += r.anuladas;
    totalComImagem += r.comImagem;
    if (!r.temaRedacao) totalSemTema++;
  }

  lines.push('## Resumo geral');
  lines.push('');
  lines.push(`- Provas processadas: ${examResults.length}`);
  lines.push(`- Total de questões: ${totalQuestoes}`);
  lines.push(`- Questões anuladas: ${totalAnuladas}`);
  lines.push(`- Questões com imagem: ${totalComImagem}`);
  lines.push(`- Questões com [ILEGÍVEL] (revisar manualmente): ${totalIlegivel}`);
  lines.push(`- Questões sem gabarito correspondente: ${totalSemGabarito}`);
  lines.push(`- Provas sem tema de redação identificado: ${totalSemTema}`);
  lines.push('');
  lines.push('## Notas sobre classificação de matéria');
  lines.push('');
  lines.push('- "Multidisciplinar" (nome usado pela FATEC em vários anos) foi mapeado para `Interdisciplinar`.');
  lines.push('- "Raciocínio Lógico" (disciplina própria da FATEC, sem equivalente na lista pedida) foi mapeado para `Interdisciplinar`.');
  lines.push('- Nenhum gabarito usa a categoria "Literatura" separadamente — questões de literatura aparecem classificadas como "Português" pelo gabarito oficial e assim permanecem.');
  lines.push('');
  lines.push('## Notas sobre imagens');
  lines.push('');
  lines.push('- A associação de imagem→questão é heurística (posição na página). Questões com figuras compartilhadas (ex: "Leia o texto para responder às questões X e Y") tendem a ser as mais confiáveis; verificar visualmente uma amostra é recomendado.');
  lines.push('- Vários cadernos renderizam trechos de texto em destaque (citações, caixas com fundo cinza) como imagem em vez de texto vetorial. Esses casos aparecem também no PNG recortado, mesmo já estando no enunciado/texto de apoio como texto — redundante, mas não incorreto.');

  return lines.join('\n');
}
