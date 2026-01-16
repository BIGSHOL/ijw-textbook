document.addEventListener('DOMContentLoaded', async () => {
  await checkConnection();
  await loadPendingCount();
  await loadSyncHistory();

  document.getElementById('open-makeedu').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://school.makeedu.co.kr' });
  });
});

/**
 * Check Firestore connection status
 */
async function checkConnection() {
  const indicator = document.getElementById('status-indicator');
  const text = document.getElementById('status-text');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'CHECK_CONNECTION' });

    if (response.success && response.connected) {
      indicator.className = 'status-indicator connected';
      text.textContent = 'Firestore 연결됨';
    } else {
      indicator.className = 'status-indicator disconnected';
      text.textContent = '연결 오류: ' + (response.error || '알 수 없음');
    }
  } catch (error) {
    indicator.className = 'status-indicator disconnected';
    text.textContent = '연결 실패';
  }
}

/**
 * Load pending request count
 */
async function loadPendingCount() {
  const countEl = document.getElementById('pending-count');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_REQUESTS' });

    if (response.success) {
      const pending = response.requests.filter(r => !r.isCompleted || !r.isPaid);
      countEl.textContent = pending.length;
    } else {
      countEl.textContent = '?';
    }
  } catch (error) {
    countEl.textContent = '?';
  }
}

/**
 * Load sync history from storage
 */
async function loadSyncHistory() {
  const listEl = document.getElementById('history-list');

  try {
    const result = await chrome.storage.local.get(['syncHistory']);
    const history = result.syncHistory || [];

    if (history.length === 0) {
      listEl.innerHTML = '<div class="empty-state">동기화 내역이 없습니다</div>';
      return;
    }

    listEl.innerHTML = history.slice(0, 10).map(item => {
      const time = formatTime(item.syncedAt);
      const statusClass = item.isPaid ? 'paid' : 'registered';
      const statusText = item.isPaid ? '완납' : '등록';

      return `
        <div class="history-item">
          <div>
            <div class="history-name">${escapeHtml(item.studentName)}</div>
            <div class="history-time">${time}</div>
          </div>
          <span class="history-status ${statusClass}">${statusText}</span>
        </div>
      `;
    }).join('');
  } catch (error) {
    listEl.innerHTML = '<div class="empty-state">내역을 불러올 수 없습니다</div>';
  }
}

/**
 * Format time for display
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return '방금 전';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}분 전`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}시간 전`;
  } else {
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
