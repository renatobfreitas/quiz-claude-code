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
  const s = Math.floor(seconds % 60);
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

// ── Tela de Entrada ────────────────────────────────────────────

function renderEntry() {
  document.getElementById('player-name').value = '';
  document.getElementById('name-error').classList.add('hidden');
  document.getElementById('player-name').classList.remove('error-input');
  showScreen('entry');
  document.getElementById('player-name').focus();
}

async function startQuiz() {
  if (document.getElementById('btn-start').disabled) return;
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
  const fill = document.getElementById('progress-fill');
  fill.style.width = `${pct}%`;
  fill.setAttribute('aria-valuenow', pct);
  document.getElementById('question-statement').textContent = q.statement;

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

// ── Tela de Feedback ───────────────────────────────────────────

function renderFeedback(question, correct, userAnswer) {
  const badge = document.getElementById('feedback-badge');
  const correctBlock = document.getElementById('feedback-correct-block');
  const correctValue = document.getElementById('feedback-correct-value');
  const docLink = document.getElementById('feedback-doc-link');

  badge.textContent = correct ? '✓ Correto!' : '✗ Incorreto';
  badge.className = 'badge ' + (correct ? 'badge-correct' : 'badge-wrong');

  if (!correct) {
    const correctLabel = question.answer ? '✓ Verdadeiro' : '✗ Falso';
    correctValue.textContent = correctLabel;
    correctBlock.classList.remove('hidden');
  } else {
    correctBlock.classList.add('hidden');
  }

  document.getElementById('feedback-statement').textContent = question.statement;
  document.getElementById('feedback-explanation').textContent = question.explanation;

  if (question.doc_url) {
    docLink.href = question.doc_url;
    docLink.classList.remove('hidden');
  } else {
    docLink.classList.add('hidden');
  }

  showScreen('feedback');
}

// ── Tela de Resultados ─────────────────────────────────────────

function renderResults() {
  const score = getScore();
  const total = state.questions.length;

  document.getElementById('results-score-big').textContent = score;
  document.getElementById('results-score-total').textContent = `de ${total}`;

  document.getElementById('results-title').textContent =
    score === total ? 'Resultado Perfeito! 🎉' : `Você acertou ${score} de ${total}`;
  document.getElementById('results-encouragement').textContent =
    getEncouragementMessage(score);

  const wrongAnswers = state.answers
    .filter(a => !a.correct)
    .map(a => state.questions.find(q => q.id === a.id))
    .filter(Boolean);

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
        <span class="ei-correct">${q.answer ? '✓ Verdadeiro' : '✗ Falso'}</span>
        <span class="ei-explain">${escapeHtml(q.explanation)}</span>
        ${q.doc_url ? `<a href="${escapeHtml(q.doc_url)}" target="_blank" rel="noopener" class="ei-link">📄 Ver documentação →</a>` : ''}
      `;
      list.appendChild(item);
    });
  }

  showScreen('results');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">Nenhum resultado ainda.</td></tr>';
    } else {
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
    }

    document.getElementById('leaderboard-loading').classList.add('hidden');
    document.getElementById('leaderboard-table').classList.remove('hidden');
  } catch (err) {
    console.error('Erro ao carregar placar:', err);
    document.getElementById('leaderboard-loading').classList.add('hidden');
    document.getElementById('leaderboard-error').classList.remove('hidden');
  }
}

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

document.getElementById('btn-next').addEventListener('click', () => {
  state.currentIndex++;
  if (state.currentIndex < state.questions.length) {
    renderPlaying();
  } else {
    state.duration = Math.round((Date.now() - state.startTime) / 1000);
    renderResults();
  }
});

document.getElementById('btn-see-leaderboard').addEventListener('click', async () => {
  const btn = document.getElementById('btn-see-leaderboard');
  btn.textContent = 'Salvando...';
  btn.disabled = true;
  try {
    await saveScore(state.playerName, getScore(), state.duration);
  } catch (err) {
    console.error('Erro ao salvar score:', err);
  }
  try {
    await renderLeaderboard();
  } finally {
    btn.textContent = 'Ver placar →';
    btn.disabled = false;
  }
});

document.getElementById('btn-play-again').addEventListener('click', renderEntry);

// ── Inicialização ──────────────────────────────────────────────
renderEntry();
