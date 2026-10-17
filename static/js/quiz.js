const quizId = location.pathname.split('/').pop();

let quiz = null;
let currentIndex = 0;
let answeredCorrectly = false;
let wrongChoiceIds = new Set();
let explainController = null;

document.addEventListener('DOMContentLoaded', loadQuiz);

async function loadQuiz() {
  try {
    const res = await fetch(`/api/quizzes/${quizId}`);
    if (!res.ok) throw new Error('Not found');
    quiz = await res.json();

    document.getElementById('loading-view').style.display = 'none';

    if (!quiz.questions || quiz.questions.length === 0) {
      showError('이 퀴즈에는 문제가 없습니다.');
      return;
    }

    // Setup back link
    const folderId = quiz.folder_id;
    document.getElementById('back-link').href = `/folder/${folderId}`;
    document.getElementById('results-back').href = `/folder/${folderId}`;

    document.getElementById('quiz-view').style.display = 'block';
    renderQuestion(0);
  } catch (err) {
    showError('퀴즈를 불러오지 못했습니다.');
  }
}

function renderQuestion(index) {
  answeredCorrectly = false;
  wrongChoiceIds.clear();

  const q = quiz.questions[index];
  const total = quiz.questions.length;

  // Progress
  const pct = Math.round((index / total) * 100);
  document.getElementById('progress-text').textContent = `문제 ${index + 1} / ${total}`;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;

  // Quiz title
  document.getElementById('quiz-title').textContent = quiz.title;

  // Question
  document.getElementById('question-num').textContent = `문제 ${index + 1}`;
  document.getElementById('question-text').textContent = q.question_text;

  // Choices
  const list = document.getElementById('choices-list');
  list.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D', 'E'];
  q.choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.dataset.choiceId = choice.id;
    btn.innerHTML = `
      <span class="choice-label">${labels[i] || i + 1}</span>
      <span class="choice-text">${esc(choice.choice_text)}</span>
    `;
    btn.addEventListener('click', () => handleChoice(choice, btn));
    list.appendChild(btn);
  });

  // Reset UI
  document.getElementById('feedback').style.display = 'none';
  hideExplanation();
  document.getElementById('next-btn').style.display = 'none';
}

async function handleChoice(choice, btn) {
  if (answeredCorrectly) return;
  if (wrongChoiceIds.has(choice.id)) return;

  const allBtns = document.querySelectorAll('.choice-btn');

  if (choice.is_correct) {
    // Correct answer
    answeredCorrectly = true;
    btn.classList.add('correct');
    allBtns.forEach(b => { b.disabled = true; });

    showFeedback(true);
    hideExplanation();
    document.getElementById('next-btn').style.display = 'inline-flex';
    document.getElementById('next-btn').textContent =
      currentIndex + 1 < quiz.questions.length ? '다음 문제 →' : '결과 보기 →';
  } else {
    // Wrong answer
    wrongChoiceIds.add(choice.id);
    btn.classList.add('wrong');
    btn.disabled = true;

    showFeedback(false);
    await fetchExplanation(quiz.questions[currentIndex], choice);
  }
}

function showFeedback(correct) {
  const el = document.getElementById('feedback');
  el.style.display = 'flex';
  if (correct) {
    el.className = 'feedback-msg feedback-correct';
    el.innerHTML = '✅ 정답입니다!';
  } else {
    el.className = 'feedback-msg feedback-wrong';
    el.innerHTML = '❌ 틀렸습니다. 다시 시도해보세요.';
  }
}

async function fetchExplanation(question, wrongChoice) {
  if (explainController) explainController.abort();
  explainController = new AbortController();

  const correctChoice = question.choices.find(c => c.is_correct);
  if (!correctChoice) return;

  showExplanationLoading();

  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_text: question.question_text,
        correct_answer: correctChoice.choice_text,
        selected_answer: wrongChoice.choice_text,
      }),
      signal: explainController.signal,
    });

    const data = await res.json();
    showExplanation(data.explanation || data.detail || '해설을 불러오지 못했습니다.');
  } catch (err) {
    if (err.name !== 'AbortError') {
      showExplanation('해설을 불러오지 못했습니다. API 키를 확인해주세요.');
    }
  }
}

function showExplanationLoading() {
  const card = document.getElementById('explanation-card');
  card.style.display = 'block';
  document.getElementById('explanation-loading').style.display = 'flex';
  document.getElementById('explanation-title').style.display = 'none';
  document.getElementById('explanation-text').textContent = '';
}

function showExplanation(text) {
  document.getElementById('explanation-loading').style.display = 'none';
  document.getElementById('explanation-title').style.display = 'flex';
  document.getElementById('explanation-text').textContent = text;
}

function hideExplanation() {
  document.getElementById('explanation-card').style.display = 'none';
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex >= quiz.questions.length) {
    showResults();
  } else {
    renderQuestion(currentIndex);
  }
}

function showResults() {
  document.getElementById('quiz-view').style.display = 'none';
  document.getElementById('results-view').style.display = 'block';
  document.getElementById('results-quiz-title').textContent = quiz.title;
  document.getElementById('results-score').textContent = `${quiz.questions.length}문제`;
  document.getElementById('results-icon').textContent = '🎉';
}

function restartQuiz() {
  currentIndex = 0;
  document.getElementById('results-view').style.display = 'none';
  document.getElementById('quiz-view').style.display = 'block';
  renderQuestion(0);
}

function showError(msg) {
  document.getElementById('loading-view').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">${msg}</div>
      <br><a href="/" class="btn btn-primary">홈으로</a>
    </div>`;
  document.getElementById('loading-view').style.display = 'block';
}

function esc(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(text));
  return d.innerHTML;
}
