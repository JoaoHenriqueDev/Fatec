# FATEC Estudos

Plataforma de estudos para o vestibular da FATEC: questões reais de provas de 2017 a 2026, simulados cronometrados, temas de redação, painel de desempenho e uma trilha de estudos gamificada por matéria (conteúdo + vídeo + quiz de aprovação).

## Sumário

- [Stack e estrutura](#stack-e-estrutura)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Rodando localmente](#rodando-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [Deploy no Railway](#deploy-no-railway)
- [Pipeline de extração das provas](#pipeline-de-extração-das-provas)
- [Solução de problemas](#solução-de-problemas)

## Stack e estrutura

- **Backend**: Node.js + Express, Postgres via [Drizzle ORM](https://orm.drizzle.team/), autenticação JWT.
- **Frontend**: React 18 + Vite + Tailwind CSS, `react-router-dom`, `recharts`.
- **Extração**: pipeline separado em Node (`mupdf` + `sharp`) que lê os PDFs das provas e gera os dados usados pelo backend.
- **Banco**: Postgres (local via Docker, ou gerenciado no Railway em produção).

```
Fatec/
├── backend/        # API Express (porta 3001 em dev)
├── frontend/        # SPA React + Vite (porta 5173 em dev)
├── extraction/       # Pipeline que lê os PDFs e gera backend/data/*.json
├── provas/          # PDFs originais (prova + gabarito) por ano/semestre
├── docker-compose.yml  # Postgres local para desenvolvimento
└── railway.json       # Configuração de build/deploy do Railway
```

Em produção, o próprio backend serve o build estático do frontend — é um deploy de **serviço único**, não dois serviços separados.

## Funcionalidades

- **Questões** — prática por matéria/ano/semestre, com correção imediata a cada resposta.
- **Simulado** — prova completa cronometrada, com navegação entre questões e gabarito ao final.
- **Redações** — temas de redação cobrados em cada edição do vestibular.
- **Painel** — gráficos de desempenho geral, por matéria e evolução ao longo do tempo.
- **Trilha** — 54 tópicos reais distribuídos em 9 matérias (Matemática, Português, História, Geografia, Física, Química, Biologia, Inglês, Interdisciplinar), cada um com texto explicativo, vídeo do YouTube e um quiz de 10 questões reais do banco — aprovação a partir de 70% de acerto, sem regressão de status entre tentativas.

## Pré-requisitos

- [Node.js](https://nodejs.org/) `>= 18`
- [Docker](https://www.docker.com/) (para o Postgres local) — ou um Postgres já rodando em algum lugar
- `npm`

## Rodando localmente

### 1. Clonar e instalar dependências

```bash
git clone git@github.com:JoaoHenriqueDev/Fatec.git
cd Fatec
npm install --prefix backend
npm install --prefix frontend
```

### 2. Subir o Postgres local

```bash
docker compose up -d
```

Isso sobe um Postgres 16 na porta `5432`, com usuário/senha/banco `fatec`/`fatec`/`fatec` (definidos em `docker-compose.yml`), com os dados persistidos num volume Docker nomeado — sobrevive a restarts do container.

### 3. Configurar o `.env` do backend

```bash
cp backend/.env.example backend/.env
```

O padrão já aponta para o Postgres do passo anterior (`postgres://fatec:fatec@localhost:5432/fatec`) — não precisa editar nada para rodar localmente.

### 4. Rodar as migrations

```bash
npm run db:migrate
```

Cria todas as tabelas (`users`, `respostas`, `simulados`, `trilha_progresso`) no banco. Só precisa rodar de novo quando o schema mudar.

### 5. Subir backend + frontend juntos

```bash
npm run dev
```

- Backend em `http://localhost:3001`
- Frontend em `http://localhost:5173` (com proxy configurado para `/auth`, `/questoes`, `/trilha`, etc. apontando pro backend)

Abra `http://localhost:5173`, crie uma conta e comece a usar.

## Variáveis de ambiente

Configuradas em `backend/.env` localmente, ou nas variáveis de ambiente do serviço em produção.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão do Postgres (`postgres://usuario:senha@host:porta/banco`). |
| `JWT_SECRET` | Recomendada em produção | Segredo usado para assinar os tokens JWT. Sem essa variável, o backend usa um valor padrão de desenvolvimento — **nunca confie nesse padrão em produção**. |
| `PORT` | Não | Porta em que o backend escuta (padrão `3001`). O Railway define isso automaticamente. |

## Scripts disponíveis

Rodados a partir da raiz do projeto:

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe backend e frontend juntos, em modo desenvolvimento (com hot-reload). |
| `npm run build` | Instala dependências do backend/frontend e gera o build de produção do frontend (usado no deploy). |
| `npm run db:migrate` | Aplica as migrations pendentes no Postgres apontado por `DATABASE_URL`. |
| `npm start` | Roda as migrations e depois inicia o backend em modo produção (serve a API e o build do frontend). É o que o Railway executa. |
| `npm run extract` | Roda o pipeline de extração dos PDFs das provas (ver [seção própria](#pipeline-de-extração-das-provas)). |

Dentro de `backend/`, também existe `npm run db:generate`, que gera uma nova migration a partir de mudanças em `backend/src/schema.js` (usa o Drizzle Kit).

## Banco de dados e migrations

O schema vive em `backend/src/schema.js` (Drizzle ORM). Para alterar o schema:

1. Edite `backend/src/schema.js`.
2. Gere a migration: `npm run db:generate --prefix backend` (cria um arquivo SQL novo em `backend/drizzle/`).
3. Aplique: `npm run db:migrate`.

As migrations já geradas ficam versionadas no repositório (`backend/drizzle/`) — nunca edite um arquivo de migration já commitado, sempre gere um novo.

## Deploy no Railway

O projeto é pensado para deploy como **um único serviço** no Railway (o backend serve o build do frontend).

### 1. Criar o serviço a partir do repositório

No painel do Railway, crie um projeto novo a partir deste repositório GitHub. O Railway detecta o `railway.json` e usa Nixpacks automaticamente — `build.buildCommand` (`npm run build`) e `deploy.startCommand` (`npm start`) já estão configurados.

### 2. Adicionar um banco Postgres

No mesmo projeto: **New** → **Database** → **Add PostgreSQL**. O Railway provisiona o banco e gera variáveis como `DATABASE_URL`, `DATABASE_PUBLIC_URL`, `PGUSER`, etc. **nesse serviço do Postgres** — você não mexe nelas diretamente.

### 3. Conectar o backend ao banco

No serviço do **backend**, vá em **Variables** → adicione uma variável e escolha a opção de **referenciar a variável de outro serviço** (não digite usuário/senha manualmente) → selecione o serviço Postgres → variável `DATABASE_URL`.

Isso cria uma referência (ex: `${{Postgres.DATABASE_URL}}`) resolvida automaticamente pelo Railway para o endereço de rede privada do banco (algo como `postgres.railway.internal`).

> **Se a rede privada não resolver** (erro `ENOTFOUND ...railway.internal` nos logs): confirme que o backend e o Postgres estão no **mesmo ambiente** do projeto (ex: ambos em "production"), e tente um novo deploy do backend depois que o Postgres já estiver de pé há alguns minutos. Se persistir, use `${{Postgres.DATABASE_PUBLIC_URL}}` no lugar — essa variável usa o proxy público do Railway e sempre funciona, independente de rede privada.

### 4. Definir `JWT_SECRET`

No serviço do backend, adicione a variável `JWT_SECRET` com um valor aleatório forte (ex: gerado com `openssl rand -hex 32`). Sem isso, o backend usa um segredo de desenvolvimento fixo, o que é inseguro em produção.

### 5. Deploy

Cada push na branch configurada dispara um novo deploy. O `npm start` roda a migration automaticamente antes de subir o servidor — não é preciso rodar migrations manualmente em produção.

## Pipeline de extração das provas

O diretório `extraction/` lê os PDFs em `provas/<ano>/<semestre>/{prova,gabarito}/` e gera `backend/data/questoes.json`, `backend/data/redacoes.json` e `relatorio.md` (relatório de qualidade da extração, com inconsistências encontradas).

```bash
npm run extract
```

Isso **sobrescreve** `questoes.json`/`redacoes.json` — por isso o mapeamento de questões para tópicos da trilha (`backend/data/questoes-topicos.json`) e os tópicos em si (`backend/data/topicos.json`) ficam em arquivos **separados**, que não são tocados pela extração.

Rodar a extração só é necessário ao adicionar uma prova nova (novos PDFs em `provas/`).

## Solução de problemas

- **`ECONNREFUSED ::1:5432` ou `127.0.0.1:5432`**: `DATABASE_URL` não está definida no ambiente onde o backend está rodando. Confirme que `backend/.env` existe localmente, ou que a variável está configurada no serviço em produção.
- **`ENOTFOUND <algo>.railway.internal`**: ver nota na seção de deploy acima — problema de rede privada do Railway, use a referência à variável correta ou troque para a `DATABASE_PUBLIC_URL`.
- **`relation "users" does not exist`** (ou qualquer tabela): as migrations não rodaram nesse banco. Rode `npm run db:migrate` manualmente apontando pro `DATABASE_URL` correto.
