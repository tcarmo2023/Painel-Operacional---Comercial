// UI utilities: toasts, modal, loading, helpers
export const UI = (() => {
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(toastContainer);
  });

  function showToast(message, type = 'info', title) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="content">
        <div class="title">${title || (type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : type === 'warning' ? 'Aviso' : 'Informação')}</div>
        <div class="message">${message}</div>
      </div>
      <button class="btn outline" aria-label="Fechar">&times;</button>
    `;
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => toast.remove());
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5500);
  }

  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.innerHTML = '<div class="spinner"></div>';
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(loadingOverlay);
  });

  function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  function openModal(modalEl) {
    modalEl.style.display = 'flex';
    const panel = modalEl.querySelector('.modal');
    requestAnimationFrame(() => panel.classList.add('open'));
  }
  function closeModal(modalEl) {
    const panel = modalEl.querySelector('.modal');
    panel.classList.remove('open');
    setTimeout(() => { modalEl.style.display = 'none'; }, 200);
  }

  function formatDateISO(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  return { showToast, showLoading, openModal, closeModal, formatDateISO };
})();
