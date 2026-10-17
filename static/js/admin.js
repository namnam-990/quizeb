let selectedFolderId = null;
let selectedFolderName = '';
let questionCounter = 0;

document.addEventListener('DOMContentLoaded', loadFolders);

// ===================== FOLDERS =====================

async function loadFolders() {
  const list = document.getElementById('folder-list');
  try {
    const res = await fetch('/api/folders');
    const folders = await res.json();

    if (folders.length === 0) {
      list.innerHTML = '<p style="font-size:.875rem;color:var(--text-light);text-align:center;padding:.5rem 0;">폴더가 없습니다.</p>';
      return;
    }

    list.innerHTML = '';
    folders.forEach(f => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.dataset.id = f.id;
      div.innerHTML = `
        <div>
          <div class="list-item-name">${esc(f.name)}</div>
          <div class="list-item-meta">퀴즈 ${f.quiz_count}개</div>
        </div>
        <button class="btn btn-sm" style="color:var(--danger);background:none;border:none;cursor:pointer;font-size:1rem;" onclick="deleteFolder(event, ${f.id})">🗑</button>
      `;
      div.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        selectFolder(f.id, f.name);
      });
      list.appendChild(div);
    });

    // Re-select previously selected folder
    if (selectedFolderId) {
      const found = folders.find(f => f.id === selectedFolderId);
      if (found) selectFolder(found.id, found.name);
    }
  } catch (err) {
    list.innerHTML = '<p style="color:var(--danger);">오류가 발생했습니다.</p>';
  }
}

function selectFolder(id, name) {
  selectedFolderId = id;
  selectedFolderName = name;

  document.querySelectorAll('.list-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.id) === id);
  });

  document.getElementById('quiz-panel-title').textContent = `📝 ${name}`;
  document.getElementById('add-quiz-btn').style.display = 'inline-flex';
  document.getElementById('bulk-quiz-btn').style.display = 'inline-flex';
  loadQuizzes(id);
}

function openFolderModal() {
  document.getElementById('folder-name-input').value = '';
  document.getElementById('folder-modal').classList.add('open');
  setTimeout(() => document.getElementById('folder-name-input').focus(), 100);
}

function closeFolderModal() {
  document.getElementById('folder-modal').classList.remove('open');
}

async function submitFolder() {
  const name = document.getElementById('folder-name-input').value.trim();
  if (!name) { showToast('폴더 이름을 입력하세요.', 'error'); return; }

  try {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error();
    closeFolderModal();
    showToast('폴더가 생성됐습니다.', 'success');
    await loadFolders();
  } catch {
    showToast('폴더 생성에 실패했습니다.', 'error');
  }
}

async function deleteFolder(e, id) {
  e.stopPropagation();
  if (!confirm('폴더와 모든 퀴즈를 삭제할까요?')) return;
  try {
    await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    if (selectedFolderId === id) {
      selectedFolderId = null;
      document.getElementById('quiz-panel-title').textContent = '📝 퀴즈';
      document.getElementById('add-quiz-btn').style.display = 'none';
      document.getElementById('bulk-quiz-btn').style.display = 'none';
      document.getElementById('quiz-list').innerHTML = `
        <div class="empty-state" style="padding:2rem 0;">
          <div class="empty-icon" style="font-size:2rem;">👈</div>
          <p class="empty-desc">왼쪽에서 폴더를 선택하세요.</p>
        </div>`;
    }
    showToast('폴더가 삭제됐습니다.', 'success');
    await loadFolders();
  } catch {
    showToast('삭제에 실패했습니다.', 'error');
  }
}

// ===================== QUIZZES =====================

async function loadQuizzes(folderId) {
  const list = document.getElementById('quiz-list');
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`/api/folders/${folderId}/quizzes`);
    const quizzes = await res.json();

    if (quizzes.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding:2rem 0;">
          <div class="empty-icon" style="font-size:2rem;">📝</div>
          <p class="empty-desc">이 폴더에 퀴즈가 없습니다.</p>
        </div>`;
      return;
    }

    list.innerHTML = '';
    quizzes.forEach(q => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.style.cursor = 'default';
      div.innerHTML = `
        <div style="flex:1; min-width:0;">
          <div class="list-item-name">${esc(q.title)}</div>
          <div class="list-item-meta">문제 ${q.question_count}개${q.description ? ' · ' + esc(q.description) : ''}</div>
        </div>
        <div style="display:flex;gap:.5rem;flex-shrink:0;">
          <a href="/quiz/${q.id}" class="btn btn-sm btn-outline" target="_blank">▶ 풀기</a>
          <button class="btn btn-sm" style="color:var(--danger);background:none;border:none;cursor:pointer;font-size:1rem;" onclick="deleteQuiz(${q.id})">🗑</button>
        </div>
      `;
      list.appendChild(div);
    });
  } catch {
    list.innerHTML = '<p style="color:var(--danger);">오류가 발생했습니다.</p>';
  }
}

async function deleteQuiz(id) {
  if (!confirm('퀴즈를 삭제할까요?')) return;
  try {
    await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
    showToast('퀴즈가 삭제됐습니다.', 'success');
    if (selectedFolderId) loadQuizzes(selectedFolderId);
    loadFolders();
  } catch {
    showToast('삭제에 실패했습니다.', 'error');
  }
}

// ===================== QUIZ MODAL =====================

function openQuizModal() {
  if (!selectedFolderId) { showToast('먼저 폴더를 선택하세요.', 'error'); return; }
  document.getElementById('quiz-title-input').value = '';
  document.getElementById('quiz-desc-input').value = '';
  document.getElementById('questions-container').innerHTML = '';
  questionCounter = 0;
  addQuestion();
  document.getElementById('quiz-modal').classList.add('open');
}

function closeQuizModal() {
  document.getElementById('quiz-modal').classList.remove('open');
}

function addQuestion() {
  const idx = questionCounter++;
  const container = document.getElementById('questions-container');
  const div = document.createElement('div');
  div.className = 'q-block';
  div.dataset.qidx = idx;
  div.innerHTML = `
    <div class="q-block-header">
      <span class="q-block-title">문제 ${idx + 1}</span>
      <button class="btn btn-sm" style="color:var(--danger);background:none;border:none;cursor:pointer;" onclick="removeQuestion(this)">✕ 삭제</button>
    </div>
    <div class="form-group" style="margin-bottom:.75rem;">
      <input class="form-input q-text" placeholder="문제를 입력하세요 *">
    </div>
    <div class="choices-container"></div>
    <button class="add-choice-btn" onclick="addChoice(this)">+ 보기 추가</button>
  `;
  container.appendChild(div);
  // Add 4 default choices
  const choicesEl = div.querySelector('.choices-container');
  for (let i = 0; i < 4; i++) addChoiceTo(choicesEl, idx, i === 0);
  renumberQuestions();
}

function removeQuestion(btn) {
  const block = btn.closest('.q-block');
  const container = document.getElementById('questions-container');
  if (container.querySelectorAll('.q-block').length <= 1) {
    showToast('문제가 최소 1개 이상 있어야 합니다.', 'error');
    return;
  }
  block.remove();
  renumberQuestions();
}

function renumberQuestions() {
  document.querySelectorAll('.q-block').forEach((el, i) => {
    el.querySelector('.q-block-title').textContent = `문제 ${i + 1}`;
  });
}

function addChoice(addBtn) {
  const block = addBtn.closest('.q-block');
  const choicesEl = block.querySelector('.choices-container');
  const idx = parseInt(block.dataset.qidx);
  addChoiceTo(choicesEl, idx, false);
}

function addChoiceTo(container, qidx, isFirst) {
  const row = document.createElement('div');
  row.className = 'choice-row';
  const radioName = `correct-${qidx}-${Date.now()}`;
  // We use a group name per question block
  const block = container.closest('.q-block');
  const groupName = `correct-q-${qidx}`;
  row.innerHTML = `
    <input type="radio" name="${groupName}" title="정답으로 선택" ${isFirst ? 'checked' : ''}>
    <input class="form-input" placeholder="보기 내용을 입력하세요">
    <button class="btn btn-sm" style="color:var(--danger);background:none;border:1px solid var(--border);cursor:pointer;" onclick="removeChoice(this)">✕</button>
  `;
  container.appendChild(row);
}

function removeChoice(btn) {
  const row = btn.closest('.choice-row');
  const container = row.closest('.choices-container');
  if (container.querySelectorAll('.choice-row').length <= 2) {
    showToast('보기는 최소 2개 이상 있어야 합니다.', 'error');
    return;
  }
  const wasChecked = row.querySelector('input[type="radio"]').checked;
  row.remove();
  // If the removed choice was selected as correct, select first
  if (wasChecked) {
    const first = container.querySelector('input[type="radio"]');
    if (first) first.checked = true;
  }
}

async function submitQuiz() {
  const title = document.getElementById('quiz-title-input').value.trim();
  const desc = document.getElementById('quiz-desc-input').value.trim();
  if (!title) { showToast('퀴즈 제목을 입력하세요.', 'error'); return; }

  const questions = [];
  const blocks = document.querySelectorAll('.q-block');
  let valid = true;

  blocks.forEach((block, qi) => {
    const qText = block.querySelector('.q-text').value.trim();
    if (!qText) { showToast(`문제 ${qi + 1}의 내용을 입력하세요.`, 'error'); valid = false; return; }

    const choices = [];
    const rows = block.querySelectorAll('.choice-row');
    if (rows.length < 2) { showToast(`문제 ${qi + 1}에 보기가 최소 2개 필요합니다.`, 'error'); valid = false; return; }

    rows.forEach((row, ci) => {
      const text = row.querySelector('input[type="text"], input.form-input').value.trim();
      const isCorrect = row.querySelector('input[type="radio"]').checked;
      if (!text) { showToast(`문제 ${qi + 1}의 ${ci + 1}번 보기를 입력하세요.`, 'error'); valid = false; return; }
      choices.push({ choice_text: text, is_correct: isCorrect, order_num: ci });
    });

    const hasCorrect = choices.some(c => c.is_correct);
    if (!hasCorrect) { showToast(`문제 ${qi + 1}의 정답을 선택하세요.`, 'error'); valid = false; return; }

    questions.push({ question_text: qText, order_num: qi, choices });
  });

  if (!valid) return;

  try {
    const res = await fetch(`/api/folders/${selectedFolderId}/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc || null, questions }),
    });
    if (!res.ok) throw new Error();
    closeQuizModal();
    showToast('퀴즈가 저장됐습니다!', 'success');
    loadQuizzes(selectedFolderId);
    loadFolders();
  } catch {
    showToast('저장에 실패했습니다.', 'error');
  }
}

// ===================== BULK JSON =====================

const BULK_EXAMPLE = [
  {
    title: '파이썬 기초',
    description: '자료형 복습',
    questions: [
      {
        question_text: 'list는 mutable인가?',
        choices: [
          { choice_text: '예', is_correct: true },
          { choice_text: '아니오', is_correct: false },
        ],
      },
      {
        question_text: '다음 중 immutable한 자료형은?',
        choices: [
          { choice_text: 'list', is_correct: false },
          { choice_text: 'dict', is_correct: false },
          { choice_text: 'tuple', is_correct: true },
          { choice_text: 'set', is_correct: false },
        ],
      },
    ],
  },
  {
    title: '네트워크 기초',
    questions: [
      {
        question_text: 'HTTP 기본 포트는?',
        choices: [
          { choice_text: '21', is_correct: false },
          { choice_text: '80', is_correct: true },
          { choice_text: '443', is_correct: false },
        ],
      },
    ],
  },
];

function openBulkModal() {
  if (!selectedFolderId) { showToast('먼저 폴더를 선택하세요.', 'error'); return; }
  document.getElementById('bulk-json-input').value = '';
  document.getElementById('bulk-file-input').value = '';
  setBulkErrors([]);
  document.getElementById('bulk-modal').classList.add('open');
}

function closeBulkModal() {
  document.getElementById('bulk-modal').classList.remove('open');
}

function fillBulkExample() {
  document.getElementById('bulk-json-input').value = JSON.stringify(BULK_EXAMPLE, null, 2);
  setBulkErrors([]);
}

function loadBulkFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('bulk-json-input').value = reader.result;
    setBulkErrors([]);
  };
  reader.readAsText(file, 'utf-8');
}

function setBulkErrors(messages) {
  const box = document.getElementById('bulk-errors');
  box.textContent = messages.join('\n');
  box.style.display = messages.length ? 'block' : 'none';
}

// Accept [quiz, ...], {quizzes: [...]}, or a single quiz object
function normalizeBulkPayload(data) {
  if (Array.isArray(data)) return { quizzes: data };
  if (data && Array.isArray(data.quizzes)) return { quizzes: data.quizzes };
  if (data && typeof data === 'object' && 'title' in data) return { quizzes: [data] };
  return null;
}

// Turn FastAPI 422 loc (e.g. ["body","quizzes",1,"questions",0,"choices"]) into readable text
function formatErrorLoc(loc) {
  const labels = { quizzes: '퀴즈', questions: '문제', choices: '보기' };
  const parts = [];
  for (let i = 0; i < loc.length; i++) {
    const key = loc[i], next = loc[i + 1];
    if (key === 'body') continue;
    if (labels[key] && typeof next === 'number') { parts.push(`${labels[key]} ${next + 1}`); i++; }
    else parts.push(String(key));
  }
  return parts.join(' > ');
}

async function submitBulk() {
  const raw = document.getElementById('bulk-json-input').value.trim();
  if (!raw) { setBulkErrors(['JSON을 입력하거나 파일을 불러오세요.']); return; }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    setBulkErrors([`JSON 형식 오류: ${err.message}`]);
    return;
  }

  const payload = normalizeBulkPayload(data);
  if (!payload) {
    setBulkErrors(['퀴즈 배열, {"quizzes": [...]}, 또는 title이 있는 퀴즈 객체여야 합니다.']);
    return;
  }

  const btn = document.getElementById('bulk-submit-btn');
  btn.disabled = true;
  try {
    const res = await fetch(`/api/folders/${selectedFolderId}/quizzes/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 422) {
      const body = await res.json();
      const msgs = (body.detail || []).map(d => `• ${formatErrorLoc(d.loc || [])}: ${d.msg}`);
      setBulkErrors(msgs.length ? msgs : ['입력값이 올바르지 않습니다.']);
      return;
    }
    if (!res.ok) throw new Error();

    const result = await res.json();
    closeBulkModal();
    showToast(`퀴즈 ${result.created}개가 등록됐습니다!`, 'success');
    loadQuizzes(selectedFolderId);
    loadFolders();
  } catch {
    setBulkErrors(['등록에 실패했습니다. 서버 상태를 확인하세요.']);
  } finally {
    btn.disabled = false;
  }
}

// ===================== UTILITIES =====================

function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function esc(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(text)));
  return d.innerHTML;
}

// Close modals on overlay click
document.getElementById('folder-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeFolderModal();
});
document.getElementById('quiz-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeQuizModal();
});
document.getElementById('bulk-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeBulkModal();
});
