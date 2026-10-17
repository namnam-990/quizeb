document.addEventListener('DOMContentLoaded', loadFolders);

async function loadFolders() {
  const grid = document.getElementById('folders-grid');
  const loading = document.getElementById('loading');
  const empty = document.getElementById('empty-state');

  try {
    const res = await fetch('/api/folders');
    const folders = await res.json();

    loading.style.display = 'none';

    if (folders.length === 0) {
      empty.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    folders.forEach(folder => {
      const a = document.createElement('a');
      a.href = `/folder/${folder.id}`;
      a.className = 'card';
      a.innerHTML = `
        <div class="card-icon">📁</div>
        <div class="card-title">${esc(folder.name)}</div>
        <div class="card-meta">퀴즈 ${folder.quiz_count}개</div>
      `;
      grid.appendChild(a);
    });
  } catch (err) {
    loading.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = '<p style="color:var(--danger);">폴더를 불러오지 못했습니다.</p>';
  }
}

function esc(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(text));
  return d.innerHTML;
}
