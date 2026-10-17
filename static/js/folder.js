const folderId = location.pathname.split('/').pop();

document.addEventListener('DOMContentLoaded', () => {
  loadFolder();
  loadQuizzes();
});

async function loadFolder() {
  try {
    const res = await fetch(`/api/folders/${folderId}`);
    if (!res.ok) return;
    const folder = await res.json();
    document.getElementById('folder-name').textContent = folder.name;
    document.getElementById('page-title').textContent = folder.name;
    document.title = `${folder.name} - 퀴즈 앱`;
  } catch (_) {}
}

async function loadQuizzes() {
  const grid = document.getElementById('quizzes-grid');
  const loading = document.getElementById('loading');
  const empty = document.getElementById('empty-state');

  try {
    const res = await fetch(`/api/folders/${folderId}/quizzes`);
    const quizzes = await res.json();

    loading.style.display = 'none';

    if (quizzes.length === 0) {
      empty.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    quizzes.forEach(quiz => {
      const a = document.createElement('a');
      a.href = `/quiz/${quiz.id}`;
      a.className = 'card';
      a.innerHTML = `
        <div class="card-icon">📝</div>
        <div class="card-title">${esc(quiz.title)}</div>
        ${quiz.description ? `<div class="card-desc">${esc(quiz.description)}</div>` : ''}
        <div class="card-meta" style="margin-top:.5rem;">문제 ${quiz.question_count}개</div>
      `;
      grid.appendChild(a);
    });
  } catch (err) {
    loading.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = '<p style="color:var(--danger);">퀴즈를 불러오지 못했습니다.</p>';
  }
}

function esc(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(text));
  return d.innerHTML;
}
