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
    duration_seconds: durationSeconds != null ? durationSeconds : null,
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
