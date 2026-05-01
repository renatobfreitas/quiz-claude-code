# PRD — Quiz Claude Code (Verdadeiro ou Falso)

**Data:** 2026-05-01
**Objetivo:** Construir um quiz web de perguntas V/F sobre Claude Code com placar público, para apoiar o aprendizado e criar engajamento entre participantes.
**Stack:** Vanilla HTML + CSS + JavaScript + Supabase, deploy no GitHub Pages.

---

## 1. Problema e Objetivo de Negócio

### O problema

Aprender Claude Code vai além de ler documentação. É preciso testar o que foi absorvido, identificar lacunas, e revisar conceitos de forma ativa. Leitura passiva raramente consolida conhecimento técnico.

### O objetivo

Criar uma ferramenta de aprendizado que:
- Force o usuário a tomar posição (verdadeiro ou falso) antes de ver a resposta
- Explique o **porquê** de cada resposta, não só o certo ou errado
- Aponte diretamente para a documentação oficial quando necessário
- Registre o resultado no banco e exiba um placar com os 10 melhores colocados
- Crie motivação extra pelo elemento competitivo do ranking

### Por que isso importa (contexto de aprendizado)

Estudos sobre aprendizado ativo mostram que o ato de **tentar responder antes de ver a resposta** melhora a retenção em até 50% comparado a ler a resposta diretamente. O quiz aplica esse princípio: o usuário é obrigado a se comprometer com uma resposta antes de ver a explicação.

O placar adiciona um segundo motivador: a gamificação leve. Ver seu nome na lista dos 10 melhores é um incentivo real para rever os erros e tentar novamente.

---

## 2. Usuário

**Perfil:** Desenvolvedor aprendendo Claude Code, que pode compartilhar o link do quiz com outros desenvolvedores do mesmo grupo de estudo.

**Contexto de uso:** Ferramenta de aprendizado com elemento social leve (placar público). Não requer login ou autenticação — o usuário se identifica apenas pelo nome que digita ao iniciar. Qualquer pessoa com o link pode participar.

---

## 3. Funcionalidades e Fluxo

### Fluxo completo

```
Tela de entrada (nome)
  → Tela de pergunta (10x)
    → Tela de feedback (após cada resposta)
  → Tela de resultados (score + revisão dos erros)
    → Placar (top 10)
```

### 3.1 Tela de entrada

- Campo de texto: "Qual é o seu nome?"
- Botão "Iniciar Quiz"
- Validação simples: nome não pode estar vazio
- O nome é armazenado no estado local do quiz e salvo no Supabase ao final

### 3.2 Tela de pergunta

- Exibe o enunciado como uma afirmação (ex: "Claude Code pode rodar offline com cache local.")
- Dois botões: **✓ Verdadeiro** e **✗ Falso**
- Barra de progresso no topo: "Pergunta 3 de 10"
- O timer começa na primeira pergunta (para calcular `duration_seconds`)

### 3.3 Tela de feedback (após cada resposta)

- Badge de resultado: **Correto** (verde) ou **Incorreto** (coral)
- Se errou: destaque explícito da **resposta correta** antes da explicação
- Explicação do porquê aquela é a resposta certa
- Link para a documentação oficial relevante
- Botão "Próxima pergunta"

### 3.4 Tela de resultados

- Placar em destaque: X de 10 acertos
- Frase de encorajamento baseada no score:
  - 0–3 acertos: "Continue praticando! Cada erro é aprendizado."
  - 4–6 acertos: "Bom progresso! Você está no caminho certo."
  - 7–9 acertos: "Muito bem! Você domina bastante sobre Claude Code."
  - 10 acertos: "Perfeito! Sessão sem erros."
- **Lista expandida dos erros** — cada erro mostra: enunciado, resposta correta, explicação, link para docs
- Se não houve erros: exibe mensagem "Nenhum erro nesta sessão!" sem a seção de revisão
- Botão "Ver placar" → salva o score no Supabase e exibe a tela de placar

### 3.5 Tela de placar (top 10)

- Tabela com os 10 melhores resultados: posição, nome, acertos, tempo
- O registro do usuário atual é destacado na lista (se estiver no top 10)
- Ordenação: maior score primeiro; desempate por menor `duration_seconds`
- Botão "Jogar novamente" → volta para a tela de entrada

### 3.6 Fora do escopo (para esta versão)

- Autenticação ou perfil de usuário persistente
- Histórico de múltiplas sessões por jogador
- Categorias/filtros de perguntas por tema
- Animações complexas ou sons

---

## 4. Arquitetura Técnica

### 4.1 Estrutura de arquivos

```
Quiz/
├── index.html      # Estrutura HTML de todas as telas
├── style.css       # Estilos e branding Anthropic
├── quiz.js         # Engine do quiz (estado, randomização, pontuação, timer)
├── supabase.js     # Módulo de acesso ao banco (leitura de perguntas, gravação de scores, busca do placar)
└── config.js       # Credenciais públicas do Supabase (SUPABASE_URL, SUPABASE_ANON_KEY)
```

**Por que 5 arquivos separados?**

Cada arquivo tem uma responsabilidade única e clara:
- `index.html` = estrutura (o esqueleto)
- `style.css` = aparência (a pele)
- `quiz.js` = comportamento (o cérebro)
- `supabase.js` = acesso a dados (o mensageiro)
- `config.js` = configuração (as chaves)

Isso significa que se você quiser adicionar uma pergunta, vai direto no Supabase. Se quiser mudar uma cor, só toca `style.css`. Se a URL do Supabase mudar, só toca `config.js`. Cada mudança tem um endereço certo.

### 4.2 Por que Vanilla HTML/CSS/JS e não React ou Next.js?

**Frameworks como React resolvem problemas de escala** — componentes reutilizáveis em times grandes, estado complexo compartilhado entre muitas telas. Nenhum desses problemas existe aqui.

Um quiz com 5 telas e dois endpoints de banco **não tem complexidade suficiente** para justificar o overhead de um framework: `npm install`, build step, JSX, bundler, etc.

Com Vanilla JS:
- O `index.html` abre direto no browser durante o desenvolvimento (sem `npm run dev`)
- Claude Code itera mais rápido sem build intermediário
- Você lê e entende 100% do código sem precisar conhecer React
- Deploy é apenas subir arquivos estáticos

**Regra prática:** use o menor nível de complexidade que resolve o problema.

### 4.3 Máquina de estados do quiz

O quiz é controlado por um único objeto de estado:

```
entry → playing → feedback → playing → ... → results → leaderboard → entry
```

**Por que uma máquina de estados?**

Em vez de dezenas de `if/else` espalhados ("se está na tela X e clicou Y, mostra Z"), a máquina centraliza a lógica de transição. Cada estado sabe como entrar e como sair. O comportamento se torna previsível: dado um estado, a tela é sempre a mesma.

```javascript
const state = {
  current: 'entry',       // tela atual
  playerName: '',         // nome digitado na entrada
  questions: [],          // 10 perguntas sorteadas do Supabase
  currentIndex: 0,        // índice da pergunta atual
  answers: [],            // [{id, correct}] — histórico de respostas
  startTime: null,        // Date.now() quando a primeira pergunta aparece
  duration: 0,            // segundos totais ao finalizar
};
```

### 4.4 Integração com Supabase

**O que é Supabase?**

Supabase é um backend-as-a-service open source baseado no PostgreSQL. Ele fornece banco de dados, autenticação, e uma API REST/realtime gerada automaticamente a partir das tabelas. Para este projeto, usaremos apenas o banco de dados via JavaScript SDK.

**Por que Supabase e não um servidor próprio?**

Criar um servidor próprio (Node.js + Express + PostgreSQL) para este projeto exigiria: provisionar uma VPS ou serviço cloud, configurar banco, escrever API, lidar com CORS, etc. Supabase elimina tudo isso — você cria as tabelas no dashboard e já tem uma API funcionando em minutos. Para aprender o padrão frontend → banco sem se perder em infraestrutura, é a escolha certa.

**Carregamento via CDN:**

```html
<!-- index.html — sem npm, sem build step -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="config.js"></script>
<script src="supabase.js"></script>
<script src="quiz.js"></script>
```

**Por que CDN e não npm?**

npm exigiria um bundler (Vite, Webpack) para empacotar as dependências antes de servir o HTML. Com CDN, o browser carrega o SDK diretamente — o projeto continua abrindo sem nenhum passo de build.

**config.js — credenciais públicas:**

```javascript
// config.js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

**Por que a anon key pode ficar no código frontend?**

A `anon key` do Supabase é projetada para ser pública. Ela é equivalente a "acesso anônimo" — sem Row Level Security (RLS), ela daria acesso total ao banco. Com RLS ativo (ver seção 5.3), ela permite apenas as operações explicitamente autorizadas (ler perguntas, inserir scores). Mesmo que alguém copie a chave, não consegue fazer mais do que um usuário normal do quiz.

**supabase.js — módulo de acesso:**

```javascript
// supabase.js
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchQuestions() {
  const { data } = await client
    .from('questions')
    .select('*')
    .eq('active', true);
  return data;
}

async function saveScore(playerName, score, durationSeconds) {
  await client.from('scores').insert({
    player_name: playerName,
    score,
    total_questions: 10,
    duration_seconds: durationSeconds,
  });
}

async function fetchLeaderboard() {
  const { data } = await client
    .from('scores')
    .select('player_name, score, total_questions, duration_seconds, created_at')
    .order('score', { ascending: false })
    .order('duration_seconds', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(10);
  return data;
}
```

### 4.5 Randomização das perguntas

```javascript
function getRandomQuestions(bank, count = 10) {
  return [...bank]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
```

**Por que embaralhar e não pegar os primeiros 10?**

Para que cada sessão seja diferente. Com um banco de 50 perguntas, embaralhar garante variedade — o quiz mantém valor mesmo após múltiplas sessões.

### 4.6 Medição de tempo (timer)

O timer começa quando a primeira pergunta é exibida e para quando o usuário clica em "Ver placar":

```javascript
state.startTime = Date.now();
// ... ao finalizar:
state.duration = Math.round((Date.now() - state.startTime) / 1000);
```

**Por que medir tempo?**

O tempo serve como desempate no placar: dois jogadores com 10 acertos ficam separados por quem terminou mais rápido. Isso incentiva não só acertar, mas também ter o conhecimento consolidado (responder com confiança, sem hesitar).

---

## 5. Banco de Dados — Supabase

### 5.1 Tabela `questions`

| Coluna        | Tipo      | Restrição        | Descrição                                      |
|---------------|-----------|------------------|------------------------------------------------|
| `id`          | serial    | PK               | Identificador auto-incremento                  |
| `statement`   | text      | not null         | Afirmação a ser avaliada como V ou F           |
| `answer`      | boolean   | not null         | `true` = Verdadeiro, `false` = Falso           |
| `explanation` | text      | not null         | Explicação do porquê da resposta correta       |
| `doc_url`     | text      | nullable         | Link para a documentação oficial relevante     |
| `category`    | text      | nullable         | Categoria temática (para uso futuro)           |
| `active`      | boolean   | default true     | `false` desativa a pergunta sem deletá-la      |

**Por que `active` em vez de deletar perguntas problemáticas?**

Deletar é irreversível. Se uma pergunta tiver um erro e você a desativar, pode corrigi-la e reativar depois. É mais seguro e mantém o histórico.

### 5.2 Tabela `scores`

| Coluna             | Tipo        | Restrição              | Descrição                                        |
|--------------------|-------------|------------------------|--------------------------------------------------|
| `id`               | uuid        | PK, gen_random_uuid()  | Identificador único imprevisível                 |
| `player_name`      | text        | not null               | Nome digitado pelo jogador na tela de entrada    |
| `score`            | smallint    | not null, 0–10         | Número de acertos na sessão                      |
| `total_questions`  | smallint    | default 10             | Total de perguntas da sessão (para percentual)   |
| `duration_seconds` | smallint    | nullable               | Segundos do início ao fim da sessão              |
| `created_at`       | timestamptz | default now()          | Data/hora da sessão                              |

**Por que `uuid` no id de scores e `serial` em questions?**

Scores são criados por qualquer pessoa via API pública. Com `uuid`, um id como `a3f9...` não revela quantos registros existem e não pode ser adivinhado para enumerar o banco. Questions são gerenciadas só pelo administrador no dashboard — `serial` (1, 2, 3...) é mais legível e suficiente.

**Por que `total_questions` se é sempre 10?**

Registrar o total permite calcular percentual de acerto (`score / total_questions * 100`) e abre espaço para sessões com número diferente de perguntas no futuro, sem precisar alterar a estrutura do banco.

### 5.3 Políticas de Row Level Security (RLS)

RLS é o mecanismo do PostgreSQL (e Supabase) que define quem pode fazer o quê em cada tabela, mesmo usando a chave pública.

| Tabela      | Operação          | Permitido para | Motivo                                             |
|-------------|-------------------|----------------|----------------------------------------------------|
| `questions` | SELECT            | anon (público) | Perguntas são conteúdo público do quiz             |
| `questions` | INSERT/UPDATE/DELETE | ninguém via API | Só administrador via dashboard do Supabase      |
| `scores`    | SELECT            | anon (público) | Placar é público — qualquer um pode ver            |
| `scores`    | INSERT            | anon (público) | Qualquer jogador pode registrar seu resultado      |
| `scores`    | UPDATE/DELETE     | ninguém via API | Scores são imutáveis — não podem ser adulterados   |

### 5.4 Query do placar

```sql
SELECT player_name, score, total_questions, duration_seconds, created_at
FROM scores
ORDER BY score DESC,
         duration_seconds ASC NULLS LAST,
         created_at ASC
LIMIT 10;
```

**Lógica de ordenação:**
1. Maior score primeiro
2. Em caso de empate: menor duração (quem terminou mais rápido)
3. Em caso de empate duplo: data mais antiga (quem fez primeiro)

---

## 6. Design Visual

### 6.1 Branding Anthropic

| Token          | Valor     | Uso                                     |
|----------------|-----------|-----------------------------------------|
| `--coral`      | `#CF6444` | Botões primários, badges de erro, links |
| `--bg`         | `#F5F0E8` | Fundo das telas                         |
| `--white`      | `#FFFFFF` | Cards flutuantes                        |
| `--green`      | `#2A9D5C` | Acertos, resposta correta               |
| `--text`       | `#1A1A1A` | Texto principal                         |
| `--muted`      | `#888888` | Texto secundário, labels                |

**Por que usar as cores do Anthropic?**

O quiz é sobre um produto Anthropic. Manter a identidade visual cria coerência — parece uma extensão da documentação oficial, não um projeto genérico.

### 6.2 Layout: card centralizado flutuante

Fundo bege `#F5F0E8`, card branco centralizado com `box-shadow` suave e `max-width: 520px`. O card cria um "modo foco" — isola a pergunta do ruído do fundo. O `max-width` mantém a linha de texto confortável em telas grandes.

### 6.3 Tela de feedback

Quando o usuário erra:
1. Badge coral "✗ Incorreto"
2. Linha "Resposta correta: **Verdadeiro**" (antes da explicação)
3. Explicação em texto
4. Link para a documentação

**Por que a resposta certa antes da explicação?**

O primeiro dado que o cérebro fixa após um erro é a correção. Colocá-la antes da explicação garante que seja lida primeiro, mesmo que o usuário leia rápido.

### 6.4 Tela de resultados

Lista expandida de todos os erros — tudo visível de uma vez, sem accordion. Em uma sessão de 10 perguntas, não há volume que justifique o clique extra para expandir cada item.

### 6.5 Tela de placar

Tabela simples com posição, nome, acertos e tempo. O registro do jogador atual fica destacado em coral se estiver no top 10.

---

## 7. Deploy — GitHub Pages + Supabase

### GitHub Pages (frontend)

GitHub Pages serve os arquivos estáticos diretamente do repositório:
- **Gratuito** — sem custos de servidor
- **CI/CD automático** — a cada `git push`, a versão mais recente fica online
- **URL pública** — acessível de qualquer dispositivo

```bash
git init
git add .
git commit -m "feat: initial quiz"
git remote add origin https://github.com/seu-usuario/quiz-claude-code.git
git push -u origin main
```

Depois: **Settings → Pages → Source: Deploy from branch → main → / (root)**.

O quiz ficará em `https://seu-usuario.github.io/quiz-claude-code/`.

### Supabase (banco de dados)

1. Criar conta em [supabase.com](https://supabase.com)
2. Novo projeto → copiar `URL` e `anon key` do dashboard (Settings → API)
3. Criar as tabelas `questions` e `scores` com o SQL gerado pelo Claude Code
4. Ativar RLS e criar as políticas
5. Popular a tabela `questions` com o banco inicial de perguntas
6. Colar as credenciais no `config.js`

**Por que não Vercel ou Netlify para o frontend?**

Vercel e Netlify são excelentes para projetos com build step (React, Next.js). Para arquivos estáticos puros, GitHub Pages é suficiente e está integrado onde o código vive — um passo a menos no fluxo.

---

## 8. Banco de Perguntas — Categorias Sugeridas

O banco inicial deve cobrir ~50 afirmações:

| Categoria                    | Exemplos de tópicos                                          | ~Qtd |
|------------------------------|--------------------------------------------------------------|------|
| Fundamentos                  | O que é Claude Code, requisitos, instalação, autenticação    | 8    |
| Comandos e slash commands    | /clear, /compact, /help, /model, /review                     | 10   |
| CLAUDE.md e configuração     | Onde pode existir, hierarquia, o que pode conter             | 8    |
| Hooks                        | Tipos (pre/post), quando disparam, casos de uso              | 8    |
| MCP (Model Context Protocol) | O que é, como configurar, casos de uso                       | 8    |
| Permissões e segurança       | Modos de permissão, o que Claude Code pode/não pode fazer    | 8    |

---

## 9. Critérios de Sucesso

O projeto estará completo quando:

- [ ] Tela de entrada valida nome não-vazio antes de iniciar
- [ ] Sessão sorteia 10 perguntas aleatórias do Supabase a cada início
- [ ] Tela de feedback mostra resposta correta, explicação e link para docs
- [ ] Tela de resultados lista todos os erros com explicações
- [ ] Score e tempo são salvos no Supabase ao final da sessão
- [ ] Placar exibe top 10 com ordenação correta (score + tempo)
- [ ] Visual segue branding Anthropic
- [ ] Banco tem no mínimo 30 perguntas ativas
- [ ] Deploy no GitHub Pages com URL pública acessível

---

## 10. Decisões Fora do Escopo (e por quê)

| Decisão                         | Motivo para não incluir agora                                                               |
|---------------------------------|---------------------------------------------------------------------------------------------|
| Autenticação                    | Nome livre é suficiente para o contexto de grupo de estudo; login adiciona atrito desnecessário |
| Histórico por jogador           | Exigiria autenticação para identificar o mesmo usuário entre sessões                       |
| Categorias/filtros por tema     | Aumenta complexidade de UI sem benefício imediato com um banco de 50 perguntas             |
| Timer visível por pergunta      | Adiciona pressão desnecessária; o tempo é medido mas não exibido durante o quiz            |
| Modo escuro                     | Bege Anthropic já é confortável; dark mode seria uma segunda iteração de trabalho          |
| Animações de transição          | Agradável, mas não contribui para o objetivo de aprendizado                                |
| Validação anti-fraude no score  | Fora do escopo para um grupo de estudo — confiança implícita entre participantes           |
