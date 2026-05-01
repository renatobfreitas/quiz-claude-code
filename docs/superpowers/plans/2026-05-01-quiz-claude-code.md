# Quiz Claude Code — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um quiz web de V/F sobre Claude Code com Supabase como backend e placar público top 10.

**Architecture:** 5 arquivos estáticos (HTML/CSS/JS) + Supabase para perguntas e scores. Sem build step — abre direto no browser. Máquina de estados controla todas as transições de tela.

**Tech Stack:** Vanilla HTML5, CSS3 (custom properties), JavaScript ES2020, Supabase JS SDK v2 (via CDN), GitHub Pages.

---

## Mapa de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `index.html` | Estrutura HTML de todas as 5 telas |
| `style.css` | Design system com variáveis Anthropic, layout de card, botões, tabela |
| `config.js` | Credenciais públicas do Supabase (URL + anon key) |
| `supabase.js` | Módulo de acesso ao banco: `fetchQuestions`, `saveScore`, `fetchLeaderboard` |
| `quiz.js` | Engine completo: estado global, funções puras, renderização de cada tela |

---

## Task 1: Scaffolding do Projeto

**Files:**
- Create: `.gitignore`
- Create: `config.js`
- Create: `supabase.js` (stub)
- Create: `quiz.js` (stub)
- Create: `style.css` (stub)
- Create: `index.html` (stub)

- [ ] **Step 1: Inicializar o repositório git**

```bash
cd "D:/Projetos/Trilha Claude Code/Quiz"
git init
```

Expected: `Initialized empty Git repository in .../Quiz/.git/`

- [ ] **Step 2: Criar .gitignore**

```
.DS_Store
.superpowers/
*.local
```

- [ ] **Step 3: Criar config.js com placeholder**

```javascript
// config.js
// Preencha com as credenciais do seu projeto Supabase
// Dashboard: https://supabase.com → Settings → API
const SUPABASE_URL = 'COLE_SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'COLE_SUA_ANON_KEY_AQUI';
```

- [ ] **Step 4: Criar stubs vazios dos demais arquivos**

Crie os arquivos `style.css`, `supabase.js`, `quiz.js` e `index.html` vazios — apenas para registrar a existência deles no git.

- [ ] **Step 5: Commit inicial**

```bash
git add .gitignore config.js style.css supabase.js quiz.js index.html
git commit -m "chore: project scaffolding"
```

---

## Task 2: Configuração do Supabase (manual — feita no dashboard)

**Esta task é executada pelo humano no dashboard do Supabase, não pelo Claude Code.**

- [ ] **Step 1: Criar conta e projeto no Supabase**

Acesse [https://supabase.com](https://supabase.com), crie uma conta gratuita e crie um novo projeto.
Anote: **Project URL** e **anon public key** em Settings → API.

- [ ] **Step 2: Criar as tabelas via SQL Editor**

No dashboard do Supabase, abra **SQL Editor** e execute:

```sql
-- Tabela de perguntas
CREATE TABLE questions (
  id serial PRIMARY KEY,
  statement text NOT NULL,
  answer boolean NOT NULL,
  explanation text NOT NULL,
  doc_url text,
  category text,
  active boolean DEFAULT true
);

-- Tabela de scores
CREATE TABLE scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  score smallint NOT NULL,
  total_questions smallint NOT NULL DEFAULT 10,
  duration_seconds smallint,
  created_at timestamptz DEFAULT now()
);
```

- [ ] **Step 3: Ativar RLS e criar políticas**

```sql
-- Ativar RLS em ambas as tabelas
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- questions: leitura pública, escrita bloqueada
CREATE POLICY "questions_public_select"
  ON questions FOR SELECT TO anon USING (true);

-- scores: leitura pública e inserção pública, update/delete bloqueados
CREATE POLICY "scores_public_select"
  ON scores FOR SELECT TO anon USING (true);

CREATE POLICY "scores_public_insert"
  ON scores FOR INSERT TO anon WITH CHECK (true);
```

- [ ] **Step 4: Preencher config.js com as credenciais reais**

Abra `config.js` e substitua os placeholders pelas credenciais copiadas no Step 1:

```javascript
const SUPABASE_URL = 'https://xyzxyzxyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

- [ ] **Step 5: Commit**

```bash
git add config.js
git commit -m "chore: add supabase credentials"
```

---

## Task 3: supabase.js — Módulo de acesso ao banco

**Files:**
- Modify: `supabase.js`

- [ ] **Step 1: Implementar o módulo completo**

```javascript
// supabase.js
// Depende de: config.js (SUPABASE_URL, SUPABASE_ANON_KEY) carregado antes no HTML
// Depende de: supabase CDN global (window.supabase)

const _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Busca todas as perguntas ativas do banco.
 * Retorna array de objetos: { id, statement, answer, explanation, doc_url, category }
 */
async function fetchQuestions() {
  const { data, error } = await _client
    .from('questions')
    .select('id, statement, answer, explanation, doc_url, category')
    .eq('active', true);
  if (error) throw new Error('Erro ao carregar perguntas: ' + error.message);
  return data;
}

/**
 * Salva o resultado de uma sessão no banco.
 * @param {string} playerName - Nome do jogador
 * @param {number} score - Número de acertos (0-10)
 * @param {number|null} durationSeconds - Duração em segundos
 */
async function saveScore(playerName, score, durationSeconds) {
  const { error } = await _client.from('scores').insert({
    player_name: playerName,
    score: score,
    total_questions: 10,
    duration_seconds: durationSeconds || null,
  });
  if (error) throw new Error('Erro ao salvar score: ' + error.message);
}

/**
 * Busca o top 10 do placar.
 * Ordenação: maior score → menor duração → data mais antiga.
 * Retorna array de: { player_name, score, total_questions, duration_seconds, created_at }
 */
async function fetchLeaderboard() {
  const { data, error } = await _client
    .from('scores')
    .select('player_name, score, total_questions, duration_seconds, created_at')
    .order('score', { ascending: false })
    .order('duration_seconds', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(10);
  if (error) throw new Error('Erro ao carregar placar: ' + error.message);
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase.js
git commit -m "feat: supabase data access module"
```

---

## Task 4: style.css — Design System Anthropic

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Implementar o CSS completo**

```css
/* style.css */

/* ── Variáveis ──────────────────────────────────────────────── */
:root {
  --coral:   #CF6444;
  --coral-light: #FFF0ED;
  --bg:      #F5F0E8;
  --white:   #FFFFFF;
  --green:   #2A9D5C;
  --green-light: #E8F8EF;
  --text:    #1A1A1A;
  --muted:   #888888;
  --border:  #E8E0D5;
  --shadow:  0 4px 24px rgba(0,0,0,0.08);
  --radius:  16px;
}

/* ── Reset e Base ───────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--text);
}

/* ── Utilitários ────────────────────────────────────────────── */
.hidden { display: none !important; }

/* ── Telas ──────────────────────────────────────────────────── */
.screen {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Card ───────────────────────────────────────────────────── */
.card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 32px 28px;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Tipografia ─────────────────────────────────────────────── */
h1 { font-size: 22px; font-weight: 800; color: var(--text); }
h2 { font-size: 20px; font-weight: 700; color: var(--text); text-align: center; }
.subtitle { font-size: 14px; color: var(--muted); text-align: center; line-height: 1.5; }
.section-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: var(--coral);
}
.divider { border: none; border-top: 1px solid var(--border); }

/* ── Tela de Entrada ────────────────────────────────────────── */
.entry-logo {
  font-size: 32px;
  text-align: center;
}
.entry-header { text-align: center; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 14px; font-weight: 600; color: var(--text); }
.field input {
  padding: 12px 14px;
  border: 2px solid var(--border);
  border-radius: 10px;
  font-size: 15px;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}
.field input:focus { border-color: var(--coral); }
.field input.error-input { border-color: var(--coral); }
.error-msg { font-size: 12px; color: var(--coral); font-weight: 600; }

/* ── Progresso ──────────────────────────────────────────────── */
.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.progress-bar {
  height: 5px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--coral);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* ── Enunciado ──────────────────────────────────────────────── */
.statement {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--text);
  padding: 8px 0;
}
.statement-sm {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

/* ── Botões de Resposta ─────────────────────────────────────── */
.answer-buttons { display: flex; gap: 12px; }
.btn-answer {
  flex: 1;
  padding: 14px 10px;
  border-radius: 10px;
  border: 2px solid;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.1s;
  background: transparent;
}
.btn-answer:active { transform: scale(0.97); }
.btn-true  { border-color: var(--green); color: var(--green); }
.btn-true:hover  { background: var(--green-light); }
.btn-false { border-color: var(--coral); color: var(--coral); }
.btn-false:hover { background: var(--coral-light); }

/* ── Botões Primário / Secundário ───────────────────────────── */
.btn-primary {
  width: 100%;
  padding: 14px;
  background: var(--coral);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.88; }

.btn-secondary {
  width: 100%;
  padding: 12px;
  background: transparent;
  color: var(--coral);
  border: 2px solid var(--coral);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-secondary:hover { background: var(--coral-light); }

/* ── Badge de Feedback ──────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  width: fit-content;
}
.badge-correct { background: var(--green-light); color: var(--green); }
.badge-wrong   { background: var(--coral-light); color: var(--coral); }

/* ── Resposta Correta (tela feedback quando erra) ───────────── */
.correct-answer-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.correct-answer-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); font-weight: 700; }
.correct-answer-value { font-size: 16px; font-weight: 700; color: var(--green); }

/* ── Explicação e Link ──────────────────────────────────────── */
.explanation { font-size: 14px; color: #444; line-height: 1.65; }
.doc-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--coral);
  font-weight: 700;
  text-decoration: none;
}
.doc-link:hover { text-decoration: underline; }

/* ── Tela de Resultados ─────────────────────────────────────── */
.score-circle {
  width: 88px; height: 88px;
  border-radius: 50%;
  background: var(--coral);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.score-circle .score-big   { font-size: 28px; font-weight: 800; line-height: 1; }
.score-circle .score-total { font-size: 12px; opacity: 0.85; }

/* ── Item de Erro na Revisão ────────────────────────────────── */
.error-item {
  background: #FFF8F6;
  border-left: 3px solid var(--coral);
  border-radius: 0 8px 8px 0;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.error-item .ei-statement { font-size: 13px; font-weight: 600; color: var(--text); }
.error-item .ei-correct   { font-size: 12px; color: var(--green); font-weight: 600; }
.error-item .ei-explain   { font-size: 12px; color: #555; line-height: 1.5; }
.error-item .ei-link      { font-size: 11px; color: var(--coral); font-weight: 700; text-decoration: none; }
.error-item .ei-link:hover { text-decoration: underline; }
.errors-list { display: flex; flex-direction: column; gap: 8px; }

/* ── Tela do Placar ─────────────────────────────────────────── */
.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.leaderboard-table th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  font-weight: 700;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
.leaderboard-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
.leaderboard-table tr:last-child td { border-bottom: none; }
.leaderboard-table .rank { font-weight: 700; color: var(--muted); width: 28px; }
.leaderboard-table .medal-1 { color: #F0B429; }
.leaderboard-table .medal-2 { color: #A0A0A0; }
.leaderboard-table .medal-3 { color: #C47A3A; }
.leaderboard-table tr.highlight td { background: var(--coral-light); font-weight: 700; }
.leaderboard-table .score-cell { font-weight: 700; }
.leaderboard-table .time-cell  { color: var(--muted); font-size: 13px; }

.loading { text-align: center; color: var(--muted); font-size: 14px; padding: 20px 0; }
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: design system css with anthropic branding"
```

---

## Task 5: index.html — Estrutura de todas as telas

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Implementar o HTML completo**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz Claude Code</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- ── Tela 1: Entrada (nome do jogador) ───────────────── -->
  <div id="screen-entry" class="screen">
    <div class="card">
      <div class="entry-logo">🤖</div>
      <div class="entry-header">
        <h1>Quiz Claude Code</h1>
        <p class="subtitle">Teste seus conhecimentos com 10 perguntas verdadeiro ou falso</p>
      </div>
      <div class="field">
        <label for="player-name">Qual é o seu nome?</label>
        <input type="text" id="player-name" placeholder="Digite seu nome" maxlength="50" autocomplete="off">
        <span id="name-error" class="error-msg hidden">Por favor, digite seu nome.</span>
      </div>
      <button id="btn-start" class="btn-primary">Iniciar Quiz →</button>
    </div>
  </div>

  <!-- ── Tela 2: Pergunta ─────────────────────────────────── -->
  <div id="screen-playing" class="screen hidden">
    <div class="card">
      <div class="progress-header">
        <span id="progress-text">Pergunta 1 de 10</span>
        <span id="progress-pct">10%</span>
      </div>
      <div class="progress-bar">
        <div id="progress-fill" class="progress-fill" style="width:10%"></div>
      </div>
      <p id="question-statement" class="statement"></p>
      <div class="answer-buttons">
        <button id="btn-true"  class="btn-answer btn-true">✓ Verdadeiro</button>
        <button id="btn-false" class="btn-answer btn-false">✗ Falso</button>
      </div>
    </div>
  </div>

  <!-- ── Tela 3: Feedback (após cada resposta) ────────────── -->
  <div id="screen-feedback" class="screen hidden">
    <div class="card">
      <span id="feedback-badge" class="badge"></span>
      <div id="feedback-correct-block" class="correct-answer-block hidden">
        <span class="correct-answer-label">Resposta correta</span>
        <span id="feedback-correct-value" class="correct-answer-value"></span>
      </div>
      <p id="feedback-statement" class="statement-sm"></p>
      <p id="feedback-explanation" class="explanation"></p>
      <a id="feedback-doc-link" href="#" target="_blank" rel="noopener" class="doc-link hidden">
        📄 Ver documentação →
      </a>
      <button id="btn-next" class="btn-primary">Próxima pergunta →</button>
    </div>
  </div>

  <!-- ── Tela 4: Resultados (fim da sessão) ───────────────── -->
  <div id="screen-results" class="screen hidden">
    <div class="card">
      <div id="results-score-circle" class="score-circle">
        <span id="results-score-big" class="score-big"></span>
        <span id="results-score-total" class="score-total"></span>
      </div>
      <h2 id="results-title"></h2>
      <p id="results-encouragement" class="subtitle"></p>
      <hr class="divider">
      <div id="results-errors-section" class="hidden">
        <p class="section-label">🔁 Revise os erros</p>
        <div id="results-errors-list" class="errors-list"></div>
      </div>
      <p id="results-no-errors" class="subtitle hidden">Nenhum erro nesta sessão! 🎉</p>
      <button id="btn-see-leaderboard" class="btn-primary">Ver placar →</button>
    </div>
  </div>

  <!-- ── Tela 5: Placar (top 10) ──────────────────────────── -->
  <div id="screen-leaderboard" class="screen hidden">
    <div class="card">
      <h2>🏆 Top 10</h2>
      <p class="subtitle">Os melhores resultados de todos os tempos</p>
      <p id="leaderboard-loading" class="loading">Carregando placar...</p>
      <table id="leaderboard-table" class="leaderboard-table hidden">
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Acertos</th>
            <th>Tempo</th>
          </tr>
        </thead>
        <tbody id="leaderboard-body"></tbody>
      </table>
      <p id="leaderboard-error" class="subtitle hidden" style="color:var(--coral)">
        Não foi possível carregar o placar.
      </p>
      <button id="btn-play-again" class="btn-secondary">Jogar novamente</button>
    </div>
  </div>

  <!-- ── Scripts (ordem importa) ──────────────────────────── -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="config.js"></script>
  <script src="supabase.js"></script>
  <script src="quiz.js"></script>
</body>
</html>
```

- [ ] **Step 2: Abrir index.html no browser e verificar**

Abra o arquivo `index.html` diretamente no browser (duplo clique ou `open index.html`).

Esperado: ver o card da tela de entrada com o emoji 🤖, título, campo de nome e botão. O botão não faz nada ainda — isso é correto.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: html structure for all 5 screens"
```

---

## Task 6: quiz.js — Engine core (estado + funções puras + testes)

**Files:**
- Modify: `quiz.js`

- [ ] **Step 1: Implementar estado global e funções puras**

```javascript
// quiz.js

// ── Estado global da aplicação ─────────────────────────────────
const state = {
  current: 'entry',       // tela atual: 'entry'|'playing'|'feedback'|'results'|'leaderboard'
  playerName: '',         // nome digitado na tela de entrada
  questions: [],          // 10 perguntas sorteadas do banco
  currentIndex: 0,        // índice da pergunta exibida (0–9)
  answers: [],            // [{id, correct}] — uma entrada por pergunta respondida
  startTime: null,        // Date.now() no momento da primeira pergunta
  duration: 0,            // duração total em segundos (calculada ao finalizar)
};

// ── Funções puras (sem efeitos colaterais) ─────────────────────

/**
 * Embaralha um array e retorna os primeiros `count` elementos.
 * Não modifica o array original.
 */
function getRandomQuestions(bank, count = 10) {
  return [...bank].sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * Retorna a frase de encorajamento baseada no número de acertos.
 */
function getEncouragementMessage(score) {
  if (score <= 3) return 'Continue praticando! Cada erro é aprendizado.';
  if (score <= 6) return 'Bom progresso! Você está no caminho certo.';
  if (score <= 9) return 'Muito bem! Você domina bastante sobre Claude Code.';
  return 'Perfeito! Sessão sem erros.';
}

/**
 * Formata segundos em string legível: "1m 32s" ou "45s".
 * Retorna "—" para valores null/undefined/0.
 */
function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Retorna a posição de medalha (#, 🥇, 🥈, 🥉) ou o número para as demais.
 */
function getMedalLabel(position) {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return String(position);
}

/**
 * Calcula o score atual (total de respostas corretas em state.answers).
 */
function getScore() {
  return state.answers.filter(a => a.correct).length;
}

// ── Testes das funções puras (rodam no console ao carregar) ────
function runTests() {
  // getRandomQuestions
  const bank = Array.from({ length: 20 }, (_, i) => ({ id: i }));
  const result = getRandomQuestions(bank, 10);
  console.assert(result.length === 10, 'getRandomQuestions: deve retornar 10 itens');
  console.assert(bank.length === 20,   'getRandomQuestions: não deve modificar o banco original');

  // getEncouragementMessage
  console.assert(getEncouragementMessage(0)  === 'Continue praticando! Cada erro é aprendizado.', 'msg score 0');
  console.assert(getEncouragementMessage(3)  === 'Continue praticando! Cada erro é aprendizado.', 'msg score 3');
  console.assert(getEncouragementMessage(4)  === 'Bom progresso! Você está no caminho certo.',    'msg score 4');
  console.assert(getEncouragementMessage(6)  === 'Bom progresso! Você está no caminho certo.',    'msg score 6');
  console.assert(getEncouragementMessage(7)  === 'Muito bem! Você domina bastante sobre Claude Code.', 'msg score 7');
  console.assert(getEncouragementMessage(9)  === 'Muito bem! Você domina bastante sobre Claude Code.', 'msg score 9');
  console.assert(getEncouragementMessage(10) === 'Perfeito! Sessão sem erros.',                    'msg score 10');

  // formatDuration
  console.assert(formatDuration(null) === '—',      'formatDuration null');
  console.assert(formatDuration(0)    === '—',      'formatDuration 0');
  console.assert(formatDuration(45)   === '45s',    'formatDuration 45s');
  console.assert(formatDuration(92)   === '1m 32s', 'formatDuration 92s');

  console.log('✅ Todos os testes passaram.');
}
runTests();

// ── Gerenciamento de telas ─────────────────────────────────────

/**
 * Oculta todas as telas e exibe somente a tela com id `screen-{name}`.
 */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  document.getElementById(`screen-${name}`).classList.remove('hidden');
  state.current = name;
}
```

- [ ] **Step 2: Verificar testes no console do browser**

Abra `index.html` no browser, abra o console do DevTools (F12).

Esperado: `✅ Todos os testes passaram.` sem nenhum `AssertionError`.

- [ ] **Step 3: Commit**

```bash
git add quiz.js
git commit -m "feat: quiz state machine core and pure functions"
```

---

## Task 7: Tela de Entrada + Tela de Pergunta

**Files:**
- Modify: `quiz.js`

- [ ] **Step 1: Implementar renderização da tela de entrada e início do quiz**

Adicione ao final de `quiz.js`:

```javascript
// ── Tela de Entrada ────────────────────────────────────────────

function renderEntry() {
  document.getElementById('player-name').value = '';
  document.getElementById('name-error').classList.add('hidden');
  document.getElementById('player-name').classList.remove('error-input');
  showScreen('entry');
  document.getElementById('player-name').focus();
}

async function startQuiz() {
  const input = document.getElementById('player-name');
  const name = input.value.trim();

  if (!name) {
    input.classList.add('error-input');
    document.getElementById('name-error').classList.remove('hidden');
    input.focus();
    return;
  }

  state.playerName = name;
  document.getElementById('btn-start').textContent = 'Carregando...';
  document.getElementById('btn-start').disabled = true;

  try {
    const bank = await fetchQuestions();
    if (bank.length < 10) throw new Error('Banco com menos de 10 perguntas ativas.');
    state.questions = getRandomQuestions(bank, 10);
    state.currentIndex = 0;
    state.answers = [];
    state.startTime = null;
    state.duration = 0;
    renderPlaying();
  } catch (err) {
    console.error(err);
    alert('Não foi possível carregar as perguntas. Verifique as credenciais do Supabase no config.js.');
  } finally {
    document.getElementById('btn-start').textContent = 'Iniciar Quiz →';
    document.getElementById('btn-start').disabled = false;
  }
}

// ── Tela de Pergunta ───────────────────────────────────────────

function renderPlaying() {
  const q = state.questions[state.currentIndex];
  const questionNumber = state.currentIndex + 1;
  const total = state.questions.length;
  const pct = Math.round((questionNumber / total) * 100);

  document.getElementById('progress-text').textContent = `Pergunta ${questionNumber} de ${total}`;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('question-statement').textContent = q.statement;

  // Inicia o timer na primeira pergunta
  if (state.currentIndex === 0) {
    state.startTime = Date.now();
  }

  showScreen('playing');
}

function handleAnswer(userAnswer) {
  const q = state.questions[state.currentIndex];
  const correct = userAnswer === q.answer;
  state.answers.push({ id: q.id, correct });
  renderFeedback(q, correct, userAnswer);
}
```

- [ ] **Step 2: Adicionar event listeners ao final de quiz.js**

```javascript
// ── Event Listeners ────────────────────────────────────────────

document.getElementById('btn-start').addEventListener('click', startQuiz);

document.getElementById('player-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startQuiz();
});

document.getElementById('player-name').addEventListener('input', () => {
  document.getElementById('player-name').classList.remove('error-input');
  document.getElementById('name-error').classList.add('hidden');
});

document.getElementById('btn-true').addEventListener('click', () => handleAnswer(true));
document.getElementById('btn-false').addEventListener('click', () => handleAnswer(false));
```

- [ ] **Step 3: Inicializar a tela de entrada ao carregar a página**

Adicione ao final de `quiz.js`, após os event listeners:

```javascript
// ── Inicialização ──────────────────────────────────────────────
renderEntry();
```

- [ ] **Step 4: Testar no browser**

Abra `index.html`. Verifique:
- [ ] Tela de entrada aparece com o campo focado
- [ ] Clicar "Iniciar Quiz" sem nome mostra mensagem de erro em coral
- [ ] Digitar nome e clicar "Iniciar Quiz" mostra "Carregando..." (se Supabase configurado) ou alert de erro (se credenciais placeholder)
- [ ] Se Supabase configurado: tela de pergunta aparece com "Pergunta 1 de 10" e a barra de progresso

- [ ] **Step 5: Commit**

```bash
git add quiz.js
git commit -m "feat: entry screen and playing screen"
```

---

## Task 8: Tela de Feedback

**Files:**
- Modify: `quiz.js`

- [ ] **Step 1: Implementar renderFeedback**

Adicione **antes** dos Event Listeners em `quiz.js`:

```javascript
// ── Tela de Feedback ───────────────────────────────────────────

function renderFeedback(question, correct, userAnswer) {
  const badge = document.getElementById('feedback-badge');
  const correctBlock = document.getElementById('feedback-correct-block');
  const correctValue = document.getElementById('feedback-correct-value');
  const docLink = document.getElementById('feedback-doc-link');

  // Badge: Correto / Incorreto
  badge.textContent = correct ? '✓ Correto!' : '✗ Incorreto';
  badge.className = 'badge ' + (correct ? 'badge-correct' : 'badge-wrong');

  // Mostrar resposta correta apenas quando errou
  if (!correct) {
    const correctLabel = question.answer ? '✓ Verdadeiro' : '✗ Falso';
    correctValue.textContent = correctLabel;
    correctBlock.classList.remove('hidden');
  } else {
    correctBlock.classList.add('hidden');
  }

  // Enunciado e explicação
  document.getElementById('feedback-statement').textContent = question.statement;
  document.getElementById('feedback-explanation').textContent = question.explanation;

  // Link para a documentação (opcional)
  if (question.doc_url) {
    docLink.href = question.doc_url;
    docLink.classList.remove('hidden');
  } else {
    docLink.classList.add('hidden');
  }

  showScreen('feedback');
}
```

- [ ] **Step 2: Adicionar listener do botão "Próxima pergunta"**

Adicione no bloco de Event Listeners:

```javascript
document.getElementById('btn-next').addEventListener('click', () => {
  state.currentIndex++;
  if (state.currentIndex < state.questions.length) {
    renderPlaying();
  } else {
    // Calcular duração total
    state.duration = Math.round((Date.now() - state.startTime) / 1000);
    renderResults();
  }
});
```

- [ ] **Step 3: Testar no browser**

Com Supabase configurado e perguntas no banco:
- [ ] Clicar "Verdadeiro" em uma pergunta cuja resposta é falsa: badge "✗ Incorreto" aparece em coral, bloco "Resposta correta" com "✗ Falso" aparece, explicação visível
- [ ] Clicar "Falso" em uma pergunta cuja resposta é falsa: badge "✓ Correto!" em verde, bloco de resposta correta oculto
- [ ] Se a pergunta tem `doc_url`: link "📄 Ver documentação →" aparece
- [ ] Clicar "Próxima pergunta" avança para a pergunta seguinte

- [ ] **Step 4: Commit**

```bash
git add quiz.js
git commit -m "feat: feedback screen with correct answer highlight"
```

---

## Task 9: Tela de Resultados

**Files:**
- Modify: `quiz.js`

- [ ] **Step 1: Implementar renderResults**

Adicione **antes** dos Event Listeners em `quiz.js`:

```javascript
// ── Tela de Resultados ─────────────────────────────────────────

function renderResults() {
  const score = getScore();
  const total = state.questions.length;

  // Score circle
  document.getElementById('results-score-big').textContent = score;
  document.getElementById('results-score-total').textContent = `de ${total}`;

  // Título e encorajamento
  document.getElementById('results-title').textContent =
    score === total ? 'Resultado Perfeito! 🎉' : `Você acertou ${score} de ${total}`;
  document.getElementById('results-encouragement').textContent =
    getEncouragementMessage(score);

  // Seção de erros
  const wrongAnswers = state.answers
    .filter(a => !a.correct)
    .map(a => state.questions.find(q => q.id === a.id));

  if (wrongAnswers.length === 0) {
    document.getElementById('results-errors-section').classList.add('hidden');
    document.getElementById('results-no-errors').classList.remove('hidden');
  } else {
    document.getElementById('results-no-errors').classList.add('hidden');
    document.getElementById('results-errors-section').classList.remove('hidden');

    const list = document.getElementById('results-errors-list');
    list.innerHTML = '';
    wrongAnswers.forEach(q => {
      const item = document.createElement('div');
      item.className = 'error-item';
      item.innerHTML = `
        <span class="ei-statement">${escapeHtml(q.statement)}</span>
        <span class="ei-correct">✓ ${q.answer ? 'Verdadeiro' : 'Falso'}</span>
        <span class="ei-explain">${escapeHtml(q.explanation)}</span>
        ${q.doc_url ? `<a href="${q.doc_url}" target="_blank" rel="noopener" class="ei-link">📄 Ver documentação →</a>` : ''}
      `;
      list.appendChild(item);
    });
  }

  showScreen('results');
}

/**
 * Escapa caracteres HTML para evitar XSS ao inserir texto via innerHTML.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: Adicionar listener do botão "Ver placar"**

Adicione no bloco de Event Listeners:

```javascript
document.getElementById('btn-see-leaderboard').addEventListener('click', async () => {
  document.getElementById('btn-see-leaderboard').textContent = 'Salvando...';
  document.getElementById('btn-see-leaderboard').disabled = true;
  try {
    await saveScore(state.playerName, getScore(), state.duration);
  } catch (err) {
    console.error('Erro ao salvar score:', err);
    // Não bloqueia — exibe placar mesmo se salvar falhar
  }
  await renderLeaderboard();
  document.getElementById('btn-see-leaderboard').textContent = 'Ver placar →';
  document.getElementById('btn-see-leaderboard').disabled = false;
});
```

- [ ] **Step 3: Testar no browser**

Complete uma sessão de 10 perguntas e verifique:
- [ ] Score circle exibe o número correto de acertos
- [ ] Frase de encorajamento corresponde ao score
- [ ] Lista de erros mostra apenas as perguntas erradas com resposta correta e explicação
- [ ] Se acertou tudo: "Nenhum erro nesta sessão! 🎉" aparece sem a lista
- [ ] Botão "Ver placar" aparece

- [ ] **Step 4: Commit**

```bash
git add quiz.js
git commit -m "feat: results screen with wrong answers review"
```

---

## Task 10: Tela de Placar (Leaderboard)

**Files:**
- Modify: `quiz.js`

- [ ] **Step 1: Implementar renderLeaderboard**

Adicione **antes** dos Event Listeners em `quiz.js`:

```javascript
// ── Tela de Placar ─────────────────────────────────────────────

async function renderLeaderboard() {
  showScreen('leaderboard');
  document.getElementById('leaderboard-loading').classList.remove('hidden');
  document.getElementById('leaderboard-table').classList.add('hidden');
  document.getElementById('leaderboard-error').classList.add('hidden');

  try {
    const rows = await fetchLeaderboard();
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    rows.forEach((row, index) => {
      const position = index + 1;
      const isCurrentPlayer =
        row.player_name === state.playerName &&
        row.score === getScore();

      const tr = document.createElement('tr');
      if (isCurrentPlayer) tr.classList.add('highlight');

      tr.innerHTML = `
        <td class="rank ${position <= 3 ? 'medal-' + position : ''}">${getMedalLabel(position)}</td>
        <td>${escapeHtml(row.player_name)}</td>
        <td class="score-cell">${row.score}/${row.total_questions}</td>
        <td class="time-cell">${formatDuration(row.duration_seconds)}</td>
      `;
      tbody.appendChild(tr);
    });

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">Nenhum resultado ainda.</td></tr>';
    }

    document.getElementById('leaderboard-loading').classList.add('hidden');
    document.getElementById('leaderboard-table').classList.remove('hidden');
  } catch (err) {
    console.error('Erro ao carregar placar:', err);
    document.getElementById('leaderboard-loading').classList.add('hidden');
    document.getElementById('leaderboard-error').classList.remove('hidden');
  }
}
```

- [ ] **Step 2: Adicionar listener do botão "Jogar novamente"**

Adicione no bloco de Event Listeners:

```javascript
document.getElementById('btn-play-again').addEventListener('click', renderEntry);
```

- [ ] **Step 3: Testar no browser**

Após completar uma sessão:
- [ ] Clicar "Ver placar" salva o score e exibe o placar
- [ ] O registro do jogador atual aparece destacado em coral se estiver no top 10
- [ ] Posições 1, 2, 3 exibem medalhas 🥇🥈🥉
- [ ] Tempos aparecem formatados ("45s", "1m 32s")
- [ ] Botão "Jogar novamente" volta para a tela de entrada com campo limpo

- [ ] **Step 4: Commit**

```bash
git add quiz.js
git commit -m "feat: leaderboard screen with top 10 and player highlight"
```

---

## Task 11: Banco de Perguntas (30 perguntas)

**Esta task é executada no SQL Editor do Supabase.**

- [ ] **Step 1: Inserir as 30 perguntas via SQL**

No **SQL Editor** do Supabase, execute:

```sql
INSERT INTO questions (statement, answer, explanation, doc_url, category) VALUES

-- Fundamentos (8)
('Claude Code é uma ferramenta de linha de comando (CLI) desenvolvida pela Anthropic para trabalhar com o modelo Claude em projetos de software.',
 true,
 'Claude Code é exatamente isso: uma CLI que permite interagir com o modelo Claude diretamente no terminal, dentro do contexto do seu projeto.',
 'https://docs.anthropic.com/en/docs/claude-code/overview',
 'Fundamentos'),

('Claude Code pode ser instalado nativamente em sistemas Windows, sem necessidade de WSL.',
 false,
 'No Windows, Claude Code requer WSL (Windows Subsystem for Linux). A instalação nativa no Windows ainda não é suportada.',
 'https://docs.anthropic.com/en/docs/claude-code/getting-started',
 'Fundamentos'),

('Claude Code funciona offline, sem necessidade de conexão com a internet.',
 false,
 'Claude Code requer conexão ativa com a API da Anthropic para processar cada resposta do modelo. Não existe modo offline.',
 'https://docs.anthropic.com/en/docs/claude-code/overview',
 'Fundamentos'),

('Claude Code requer autenticação com uma conta Anthropic para ser utilizado.',
 true,
 'É necessário ter uma conta na Anthropic e estar autenticado (via OAuth ou chave de API) para que o Claude Code possa acessar o modelo.',
 'https://docs.anthropic.com/en/docs/claude-code/getting-started',
 'Fundamentos'),

('O uso do Claude Code é gratuito e não consome créditos da API Anthropic.',
 false,
 'Claude Code consome tokens da API Anthropic normalmente. O custo depende do plano e do volume de uso — não há versão gratuita ilimitada.',
 'https://docs.anthropic.com/en/docs/claude-code/costs',
 'Fundamentos'),

('Claude Code pode ser integrado como extensão nos editores VS Code e JetBrains.',
 true,
 'Claude Code oferece extensões para VS Code e IDEs JetBrains, permitindo uso integrado ao editor sem precisar alternar para o terminal.',
 'https://docs.anthropic.com/en/docs/claude-code/ide-integrations',
 'Fundamentos'),

('Claude Code tem acesso ao sistema de arquivos do projeto onde é executado.',
 true,
 'Claude Code lê e modifica arquivos do projeto automaticamente. É por isso que ele consegue entender o contexto do código e fazer alterações diretamente.',
 'https://docs.anthropic.com/en/docs/claude-code/overview',
 'Fundamentos'),

('Claude Code é capaz de executar comandos no terminal do sistema operacional.',
 true,
 'Claude Code pode rodar comandos como npm test, git commit, python script.py, etc. Isso é parte central de seu funcionamento como agente de desenvolvimento.',
 'https://docs.anthropic.com/en/docs/claude-code/security',
 'Fundamentos'),

-- Comandos e Slash Commands (8)
('O comando /clear apaga o histórico de conversa da sessão atual, liberando espaço no contexto.',
 true,
 '/clear reinicia a conversa sem encerrar o Claude Code. Útil quando o contexto está cheio ou você quer começar um novo assunto.',
 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
 'Comandos'),

('O comando /compact exclui permanentemente mensagens antigas da conversa.',
 false,
 '/compact comprime o histórico da conversa em um resumo, preservando o contexto essencial sem deletar nada permanentemente. O objetivo é economizar tokens.',
 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
 'Comandos'),

('O comando /help exibe a lista de slash commands disponíveis no Claude Code.',
 true,
 '/help mostra todos os comandos disponíveis com uma descrição de cada um. É o ponto de partida para descobrir o que o Claude Code suporta.',
 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
 'Comandos'),

('O comando /model permite trocar o modelo Claude utilizado durante a sessão.',
 true,
 '/model lista os modelos disponíveis (Opus, Sonnet, Haiku) e permite selecionar qual usar na sessão atual.',
 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
 'Comandos'),

('Usar ! antes de um texto executa aquele texto como comando do sistema operacional dentro do Claude Code.',
 true,
 'O prefixo ! (bang) permite executar comandos de shell diretamente — por exemplo, !git status ou !npm test — sem sair da sessão do Claude Code.',
 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
 'Comandos'),

('O atalho Ctrl+C interrompe a resposta do Claude Code que está sendo gerada.',
 true,
 'Ctrl+C cancela a geração em andamento imediatamente, sem encerrar a sessão. Útil quando o Claude está indo em uma direção errada.',
 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
 'Comandos'),

('O comando /cost mostra o custo estimado em tokens da sessão atual.',
 true,
 '/cost exibe o uso de tokens e o custo estimado acumulado na sessão, ajudando a monitorar o consumo da API.',
 'https://docs.anthropic.com/en/docs/claude-code/costs',
 'Comandos'),

('O comando /init cria automaticamente um arquivo CLAUDE.md com instruções geradas para o projeto atual.',
 true,
 '/init analisa o projeto atual e gera um arquivo CLAUDE.md com contexto relevante como linguagem, estrutura e convenções detectadas.',
 'https://docs.anthropic.com/en/docs/claude-code/memory',
 'Comandos'),

-- CLAUDE.md e Configuração (6)
('O arquivo CLAUDE.md só pode existir na raiz do projeto.',
 false,
 'CLAUDE.md pode existir em múltiplos níveis: raiz do projeto, subdiretórios, e até no diretório home (~/.claude/CLAUDE.md) como instruções globais.',
 'https://docs.anthropic.com/en/docs/claude-code/memory',
 'CLAUDE.md'),

('O arquivo CLAUDE.md é lido pelo Claude Code como contexto de instruções do projeto.',
 true,
 'Claude Code lê o CLAUDE.md automaticamente ao iniciar uma sessão e usa seu conteúdo como contexto persistente — sem precisar explicar o projeto toda vez.',
 'https://docs.anthropic.com/en/docs/claude-code/memory',
 'CLAUDE.md'),

('As instruções no CLAUDE.md têm precedência absoluta sobre qualquer instrução dada no chat.',
 false,
 'O CLAUDE.md fornece contexto e preferências, mas instruções dadas diretamente no chat podem sobrepô-las para uma tarefa específica.',
 'https://docs.anthropic.com/en/docs/claude-code/memory',
 'CLAUDE.md'),

('Um projeto pode ter múltiplos arquivos CLAUDE.md em diferentes subdiretórios.',
 true,
 'Claude Code lê CLAUDE.md de forma hierárquica: do diretório raiz até o diretório atual. Cada subdiretório pode ter seu próprio CLAUDE.md com instruções específicas.',
 'https://docs.anthropic.com/en/docs/claude-code/memory',
 'CLAUDE.md'),

('O Claude Code lê automaticamente o arquivo ~/.claude/CLAUDE.md como instruções globais para todos os projetos.',
 true,
 'O CLAUDE.md no diretório home (~/.claude/) funciona como configuração global, aplicada a todos os projetos. Ideal para preferências pessoais de estilo e comportamento.',
 'https://docs.anthropic.com/en/docs/claude-code/memory',
 'CLAUDE.md'),

('O CLAUDE.md suporta apenas texto puro, sem formatação Markdown.',
 false,
 'CLAUDE.md é um arquivo Markdown padrão. Você pode usar títulos, listas, código e qualquer formatação Markdown para organizar as instruções.',
 'https://docs.anthropic.com/en/docs/claude-code/memory',
 'CLAUDE.md'),

-- Hooks (4)
('Hooks no Claude Code permitem executar scripts automaticamente antes ou depois de ações do Claude.',
 true,
 'Hooks são comandos shell configurados para disparar em eventos específicos do Claude Code, como antes de usar uma ferramenta (PreToolUse) ou após uma resposta (PostToolUse).',
 'https://docs.anthropic.com/en/docs/claude-code/hooks',
 'Hooks'),

('Hooks são configurados dentro do arquivo CLAUDE.md.',
 false,
 'Hooks são configurados no arquivo settings.json do Claude Code (em .claude/settings.json), não no CLAUDE.md. CLAUDE.md é para instruções em linguagem natural.',
 'https://docs.anthropic.com/en/docs/claude-code/hooks',
 'Hooks'),

('Um hook do tipo PreToolUse pode impedir a execução de uma ferramenta antes que ela aconteça.',
 true,
 'Se um hook PreToolUse retorna exit code não-zero, o Claude Code cancela a execução da ferramenta. Isso permite criar validações ou bloqueios customizados.',
 'https://docs.anthropic.com/en/docs/claude-code/hooks',
 'Hooks'),

('Hooks do Claude Code só podem executar scripts Python.',
 false,
 'Hooks executam qualquer comando de shell — bash scripts, Node.js, Python, binários, ou qualquer coisa que o terminal suporte.',
 'https://docs.anthropic.com/en/docs/claude-code/hooks',
 'Hooks'),

-- MCP (4)
('MCP significa "Model Context Protocol" e é um padrão aberto para conectar modelos de IA a ferramentas e fontes de dados externas.',
 true,
 'Model Context Protocol (MCP) é um protocolo criado pela Anthropic que padroniza como modelos de IA se conectam a ferramentas externas, APIs, bancos de dados e sistemas de arquivos.',
 'https://docs.anthropic.com/en/docs/claude-code/mcp',
 'MCP'),

('Para usar um servidor MCP no Claude Code, ele precisa ser configurado no settings.json.',
 true,
 'Servidores MCP são registrados em .claude/settings.json (ou nas configurações globais). O Claude Code os inicializa automaticamente na sessão.',
 'https://docs.anthropic.com/en/docs/claude-code/mcp',
 'MCP'),

('Claude Code já vem com servidores MCP pré-instalados que funcionam sem nenhuma configuração adicional.',
 false,
 'Claude Code não vem com servidores MCP pré-instalados. Cada servidor MCP precisa ser instalado e configurado manualmente no settings.json.',
 'https://docs.anthropic.com/en/docs/claude-code/mcp',
 'MCP'),

('Um servidor MCP pode dar ao Claude Code acesso a bancos de dados, APIs externas e sistemas de arquivos remotos.',
 true,
 'Essa é exatamente a proposta do MCP: estender as capacidades do Claude Code com ferramentas customizadas. Há servidores MCP para Postgres, GitHub, Slack, Figma, e muito mais.',
 'https://docs.anthropic.com/en/docs/claude-code/mcp',
 'MCP');
```

- [ ] **Step 2: Verificar no dashboard**

No Supabase, abra **Table Editor → questions** e confirme que há 30 registros com `active = true`.

- [ ] **Step 3: Testar o quiz completo no browser**

Inicie o quiz e responda as 10 perguntas. Verifique que:
- [ ] As perguntas exibidas são sobre Claude Code
- [ ] As respostas e explicações correspondem ao conteúdo esperado
- [ ] O placar é salvo corretamente após "Ver placar"

---

## Task 12: Teste E2E e Polimento Final

**Files:**
- Nenhum arquivo novo — verificação manual completa

- [ ] **Step 1: Teste do fluxo feliz (tudo correto)**

Abra o quiz, use o nome "Teste OK", responda 10 perguntas acertando todas deliberadamente (marque a resposta certa):
- [ ] Tela de entrada: campo funciona, botão inicia
- [ ] Tela de pergunta: progresso avança a cada resposta
- [ ] Tela de feedback: badge "✓ Correto!" em verde, explicação visível
- [ ] Tela de resultados: "10 de 10", "Perfeito! Sessão sem erros.", "Nenhum erro nesta sessão! 🎉"
- [ ] Placar: aparece com "Teste OK" destacado, tempo exibido corretamente

- [ ] **Step 2: Teste com erros**

Reinicie, use "Teste Erros", erre pelo menos 3 perguntas intencionalmente:
- [ ] Badge "✗ Incorreto" em coral nas perguntas erradas
- [ ] Bloco "Resposta correta: ✓ Verdadeiro/✗ Falso" visível
- [ ] Tela de resultados: lista expandida com todos os erros
- [ ] Frase de encorajamento corresponde ao score

- [ ] **Step 3: Teste de validação do nome**

Na tela de entrada, clique "Iniciar Quiz" sem digitar nome:
- [ ] Borda do campo fica coral
- [ ] Mensagem "Por favor, digite seu nome." aparece
- [ ] Ao digitar um caractere, o erro some

- [ ] **Step 4: Teste do botão "Jogar novamente"**

No placar, clique "Jogar novamente":
- [ ] Volta para tela de entrada com campo vazio

- [ ] **Step 5: Commit final antes do deploy**

```bash
git add -A
git commit -m "feat: complete quiz with supabase integration and leaderboard"
```

---

## Task 13: Deploy — GitHub Pages

- [ ] **Step 1: Criar repositório no GitHub**

Acesse [https://github.com/new](https://github.com/new) e crie um repositório público chamado `quiz-claude-code`.

- [ ] **Step 2: Conectar e fazer push**

```bash
git remote add origin https://github.com/SEU-USUARIO/quiz-claude-code.git
git branch -M main
git push -u origin main
```

Expected: arquivos enviados ao GitHub sem erros.

- [ ] **Step 3: Ativar GitHub Pages**

No repositório do GitHub:
1. Clique em **Settings** → **Pages**
2. Em **Source**: selecione **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Clique **Save**

Aguarde ~60 segundos.

- [ ] **Step 4: Verificar a URL pública**

Acesse `https://SEU-USUARIO.github.io/quiz-claude-code/` e confirme que o quiz carrega e funciona completo.

- [ ] **Step 5: Commit com URL no config**

Adicione a URL pública como comentário no topo de `config.js`:

```javascript
// Quiz Claude Code — https://SEU-USUARIO.github.io/quiz-claude-code/
const SUPABASE_URL = 'https://...';
const SUPABASE_ANON_KEY = 'eyJ...';
```

```bash
git add config.js
git commit -m "chore: add public url to config"
git push
```

---

## Checklist Final de Critérios de Sucesso

- [ ] Quiz abre no browser sem nenhuma instalação ou servidor
- [ ] Tela de entrada valida nome não-vazio antes de iniciar
- [ ] Sessão sorteia 10 perguntas aleatórias do Supabase a cada início
- [ ] Tela de feedback mostra resposta correta, explicação e link para docs
- [ ] Tela de resultados lista todos os erros com explicações expandidas
- [ ] Score e tempo são salvos no Supabase ao final da sessão
- [ ] Placar exibe top 10 com ordenação correta (score DESC, tempo ASC)
- [ ] Visual segue branding Anthropic (coral, bege, card flutuante)
- [ ] Banco tem 30 perguntas ativas cobrindo 5 categorias
- [ ] Deploy no GitHub Pages com URL pública acessível
