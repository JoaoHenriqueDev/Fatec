# Trilha de estudos gamificada — design

Data: 2026-10-12

## Contexto

O FATEC Estudos hoje oferece prática por matéria/ano/semestre (`Questões`), simulados
cronometrados completos (`Simulado`), temas de redação (`Redações`) e um painel de
desempenho (`Painel`). Essa feature adiciona um quarto modo de estudo: uma **trilha por
matéria**, dividida em tópicos específicos (ex: Matemática → Porcentagem), onde o aluno lê
um conteúdo, assiste um vídeo, e faz um quiz de 10 questões — precisando acertar pelo menos
7 para ser considerado aprovado naquele tópico.

Pré-requisito já implementado: o backend migrou de `node:sqlite` para Postgres + Drizzle
ORM (ver histórico do repositório — tabelas `users`, `respostas`, `simulados` já vivem no
Postgres). Este design assume essa base.

## Objetivos

- Organizar o conteúdo das matérias em tópicos menores e mais focados que "a matéria toda".
- Dar ao aluno uma visão visual de progresso por matéria (trilha), sem bloquear nada —
  todos os tópicos ficam acessíveis desde o início.
- Reaproveitar ao máximo o que já existe (banco real de questões do vestibular, componente
  `QuestionCard`, padrão de telas do Simulado) em vez de construir um sistema paralelo.

## Não-objetivos (YAGNI, decidido explicitamente)

- Sem XP, nível, streak ou badges — avaliado e descartado na fase de brainstorming. Só o
  status visual por tópico (não iniciado / reprovado / aprovado).
- Sem bloqueio/desbloqueio sequencial de tópicos.
- Sem geração de conteúdo por IA em tempo de execução — texto e vídeo são curados
  manualmente e armazenados como dado estático.
- Sem cronômetro no quiz da trilha (diferente do Simulado).

## Modelo de dados

### Conteúdo estático (curado manualmente, versionado no repositório)

`backend/data/topicos.json` — lista de tópicos:

```json
{
  "id": "mat-porcentagem",
  "materia": "Matemática",
  "nome": "Porcentagem",
  "ordem": 3,
  "conteudo": "texto explicativo em texto puro (parágrafos separados por quebra de linha, sem markdown)",
  "videoUrl": "https://www.youtube.com/embed/XXXXX"
}
```

`backend/data/questoes-topicos.json` — mapeamento `questaoId → topicoId`, mantido
**separado** do `questoes.json` gerado pela extração (que é regenerado a cada
`npm run extract` e não pode carregar curadoria manual):

```json
{ "2019-1-q07": "mat-porcentagem", "2021-2-q12": "mat-porcentagem" }
```

Em `backend/src/data.js`, esse mapeamento é mesclado em memória: cada questão ganha um
campo `topico` (ou `null` se ainda não marcada). Questões sem tópico continuam aparecendo
normalmente em `Questões` e `Simulado`.

### Banco (Postgres via Drizzle)

Nova tabela `trilha_progresso` em `backend/src/schema.js`:

```js
export const trilhaProgresso = pgTable(
  'trilha_progresso',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    topicoId: text('topico_id').notNull(),
    status: text('status').notNull().default('nao_iniciado'),
    melhorAcertos: integer('melhor_acertos'),
    tentativas: integer('tentativas').notNull().default(0),
    atualizadoEm: timestamp('atualizado_em', { mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [
    check('status_check', sql`${table.status} IN ('nao_iniciado', 'reprovado', 'aprovado')`),
    unique('trilha_progresso_user_topico').on(table.userId, table.topicoId),
  ]
);
```

A tabela `respostas` existente precisa de uma migration alterando o `CHECK` de `modo` para
incluir `'trilha'` junto de `'pratica'` e `'simulado'` (hoje só aceita as duas primeiras).

## API

Todas as rotas abaixo exigem `requireAuth`, seguindo o padrão das rotas existentes.

### `GET /trilha/topicos`

Retorna todos os tópicos (todas as matérias) com o progresso do usuário logado, via left
join com `trilha_progresso`:

```json
[
  {
    "id": "mat-porcentagem",
    "materia": "Matemática",
    "nome": "Porcentagem",
    "ordem": 3,
    "conteudo": "...",
    "videoUrl": "...",
    "status": "nao_iniciado",
    "melhorAcertos": null,
    "tentativas": 0
  }
]
```

Um único endpoint, sem paginação — o volume total de tópicos é pequeno (dezenas, não
milhares), então não há necessidade de separar lista/detalhe. O frontend agrupa por
`materia` e ordena por `ordem` no cliente.

### `GET /trilha/topicos/:id/quiz`

Sorteia até 10 questões do pool daquele tópico (via `questao.topico === id`), em ordem
aleatória, **sem o campo `correta`** — diferente do `/questoes` existente, aqui a resposta
certa não pode ir no payload antes de o aluno responder.

- Se o pool tiver 10 ou mais questões: sorteia exatamente 10, sem repetição.
- Se o pool tiver menos de 10: devolve todas as disponíveis (o "total" do quiz passa a ser
  esse número, não fixo em 10).
- Se o pool estiver vazio: `404 { erro: 'Ainda não há questões cadastradas para este tópico' }`.

### `POST /trilha/topicos/:id/quiz`

Body: `{ respostas: { "<questao_id>": "<letra>", ... } }`.

O servidor:
1. Para cada questão do tópico presente no body, busca a questão real em `questoesById` e
   calcula `correta` (nunca confia na correção vinda do cliente).
2. Insere uma linha em `respostas` por questão respondida (`modo: 'trilha'`), reaproveitando
   a lógica já existente em `routes/respostas.js`.
3. Calcula `acertos` e `total` (tamanho do quiz enviado).
4. Faz upsert em `trilha_progresso` (`onConflictDoUpdate` por `(user_id, topico_id)`):
   - `tentativas = tentativas + 1`
   - `melhorAcertos = max(melhorAcertos atual, acertos)`
   - `status = 'aprovado'` se `acertos / total >= 0.7` **ou** o status já era `'aprovado'`
     (aprovação nunca regride numa tentativa pior depois); senão `'reprovado'`.
5. Responde:

```json
{
  "acertos": 8,
  "total": 10,
  "aprovado": true,
  "melhorAcertos": 8,
  "tentativas": 2,
  "questoes": [ /* as mesmas questões enviadas, agora com "correta" preenchido */ ]
}
```

O campo `questoes` devolvido já contém `correta`, permitindo que a tela de resultado
reaproveite o `QuestionCard` com `showCorrection` exatamente como a tela de resultado do
Simulado já faz hoje — sem nenhuma mudança nesse componente.

## Frontend

### Navegação

Novo item "Trilha" em `Layout.jsx`, junto de Questões/Simulado/Redação/Painel.

### `pages/Trilha.jsx` (nova, rota `/app/trilha`)

Busca `GET /trilha/topicos` uma vez. Agrupa por `materia` (mesmo padrão usado em
`Questoes.jsx` pra agrupar `provas` por ano). Cada matéria é renderizada como uma seção com
seus tópicos em sequência, ordenados por `ordem`, cada um como um nó clicável com um ícone
de status:

- cinza — `nao_iniciado`
- laranja — `reprovado`
- verde — `aprovado`

Clicar em um tópico navega para `/app/trilha/:id`.

### `pages/Topico.jsx` (nova, rota `/app/trilha/:id`)

Três fases de estado local, no mesmo padrão de máquina de estados já usado em
`Simulado.jsx` (`'conteudo' | 'quiz' | 'resultado'`):

- **conteudo**: renderiza `topico.conteudo` (texto simples, `whitespace-pre-line`, mesmo
  padrão usado pro enunciado das questões) e o vídeo (`<iframe>` com `topico.videoUrl`,
  dentro de um wrapper com aspect-ratio 16:9 responsivo). Botão "Fazer quiz" — desabilitado
  com uma mensagem se `GET /trilha/topicos/:id/quiz` vier `404` (tópico ainda sem questões
  cadastradas).
- **quiz**: busca o quiz sorteado, navega entre as questões com os botões ←/→ já usados em
  `Questoes.jsx`/`Simulado.jsx`, reaproveitando `QuestionCard` sem `showCorrection`. Botão
  "Finalizar quiz" ao final.
- **resultado**: faz o `POST` com as respostas acumuladas em estado local, mostra a nota
  (`"8/10 — Aprovado!"` ou `"4/10 — Reprovado"`) e a lista completa corrigida via
  `QuestionCard showCorrection`. Botões "Tentar de novo" (busca um novo sorteio de quiz) e
  "Voltar pra trilha" (`navigate('/app/trilha')`).

Nenhuma mudança é necessária em `QuestionCard.jsx` — reaproveitado como está.

### `api/client.js`

Três métodos novos:

```js
getTrilha: () => request('/trilha/topicos'),
getQuizTopico: (id) => request(`/trilha/topicos/${id}/quiz`),
postQuizTopico: (id, respostas) => request(`/trilha/topicos/${id}/quiz`, { method: 'POST', body: { respostas } }),
```

### `App.jsx`

Duas rotas novas dentro do grupo protegido `/app`:

```jsx
<Route path="trilha" element={<Trilha />} />
<Route path="trilha/:id" element={<Topico />} />
```

## Tratamento de erros / casos de borda

- Tópico sem questões cadastradas → `GET .../quiz` retorna `404`; a tela de conteúdo
  mostra o botão "Fazer quiz" desabilitado com aviso, em vez de travar a navegação.
- Tópico com menos de 10 questões no pool → quiz roda normalmente com o total disponível;
  a nota de aprovação permanece ≥70% do total daquele quiz (não um número fixo de 10).
- Reenvio do quiz (retry) sempre sorteia um novo conjunto de questões do pool — evita que o
  aluno apenas memorize as respostas da tentativa anterior.
- Aprovação é monotônica: uma vez `aprovado`, uma tentativa pior depois não reverte o status
  para `reprovado` (mantém `melhorAcertos` e `status` consistentes com o melhor resultado já
  alcançado).

## Validação / teste

Não há suite automatizada no projeto hoje (mesma situação já identificada antes da
migração para Postgres). A verificação segue o mesmo roteiro manual já usado pra validar
Postgres: subir o backend local, autenticar, e percorrer o fluxo completo via `curl` —
listar tópicos, sortear quiz, responder, finalizar, confirmar que `trilha_progresso` e
`respostas` refletem o resultado esperado, e repetir uma segunda tentativa pra confirmar a
regra de não regressão do status `aprovado`.

## Trabalho de conteúdo (fora do código)

A curadoria de `topicos.json`, `questoes-topicos.json` (marcação das questões existentes por
tópico) e a escolha dos vídeos do YouTube é trabalho manual do autor do projeto, feito em
paralelo à implementação — não faz parte do código a ser escrito nesta spec, mas é
pré-requisito prático para o quiz funcionar com dados reais em cada tópico.
