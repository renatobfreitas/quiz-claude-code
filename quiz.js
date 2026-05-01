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
