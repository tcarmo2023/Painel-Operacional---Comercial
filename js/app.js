import { UI } from './ui.js';
import { Config } from './supabase.js';

export const AppState = {
  currentUser: null,
  sector: null, // 'comercial' | 'pos' | 'ambos'
};

function getSavedUser() {
  try { return JSON.parse(localStorage.getItem('normaqUser') || 'null'); } catch { return null; }
}

function logout() {
  localStorage.removeItem('normaqUser');
  window.location.href = 'index.html';
}

function applyRoleVisibility() {
  const isAdmin = AppState.currentUser?.role === 'admin' || AppState.currentUser?.role === 'Administrador';
  const setor = (AppState.currentUser?.setor || 'ambos').toLowerCase();

  document.querySelectorAll('[data-section]')?.forEach(el => {
    const section = el.getAttribute('data-section');
    let visible = false;
    if (section === 'admin') visible = isAdmin;
    if (section === 'comercial') visible = setor === 'comercial' || setor === 'ambos' || isAdmin;
    if (section === 'pos') visible = setor === 'pós-vendas' || setor === 'pos' || setor === 'ambos' || isAdmin;
    el.style.display = visible ? '' : 'none';
  });
}

function initNav() {
  const navBtns = document.querySelectorAll('[data-nav]');
  navBtns.forEach(btn => btn.addEventListener('click', () => {
    const view = btn.getAttribute('data-nav');
    showView(view);
    navBtns.forEach(b => b.removeAttribute('aria-current'));
    btn.setAttribute('aria-current','page');
  }));
}

function showView(view) {
  document.querySelectorAll('[data-view]')?.forEach(el => { el.style.display = 'none'; });
  const target = document.querySelector(`[data-view="${view}"]`);
  if (target) target.style.display = '';
  // Toggle subnavs by section
  const subCom = document.querySelector('[data-view-subnav="comercial"]');
  const subPos = document.querySelector('[data-view-subnav="pos"]');
  if (view === 'comercial') {
    if (subCom) subCom.style.display = '';
    if (subPos) subPos.style.display = 'none';
  } else if (view === 'pos') {
    if (subCom) subCom.style.display = 'none';
    if (subPos) subPos.style.display = '';
  } else {
    if (subCom) subCom.style.display = 'none';
    if (subPos) subPos.style.display = 'none';
  }
  // select first subtab automatically
  const firstTab = target?.querySelector('.subnav .tab-btn');
  if (firstTab) firstTab.click();
}

function initTabs(container) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b => b.removeAttribute('aria-selected'));
      btn.setAttribute('aria-selected', 'true');
      container.querySelectorAll('[data-tab-panel]')?.forEach(p => { p.style.display = 'none'; });
      const panel = container.querySelector(`[data-tab-panel="${tab}"]`);
      if (panel) panel.style.display = '';
      const ev = new CustomEvent('tabchange', { detail: { tab, container } });
      container.dispatchEvent(ev);
    });
  });
}

export function bootApp() {
  AppState.currentUser = getSavedUser();
  if (!AppState.currentUser) {
    window.location.href = 'index.html';
    return;
  }
  document.getElementById('userName').textContent = AppState.currentUser.nome || AppState.currentUser.email;
  document.getElementById('logoutBtn').addEventListener('click', logout);

  applyRoleVisibility();
  initNav();

  // Init all tab containers
  document.querySelectorAll('[data-tabs]')?.forEach(initTabs);

  // Select the first visible main nav by default
  const firstVisibleNav = Array.from(document.querySelectorAll('[data-nav]')).find(btn => getComputedStyle(btn).display !== 'none');
  if (firstVisibleNav) firstVisibleNav.click();
}

window.NORMAQ_APP = { bootApp };
