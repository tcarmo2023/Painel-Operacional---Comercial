import { UI } from './ui.js';
import { Config, apiGet, apiUpdate } from './supabase.js';

const elements = {};

function cacheDom() {
  elements.loginScreen = document.getElementById('loginScreen');
  elements.loginForm = document.getElementById('loginForm');
  elements.registerLink = document.getElementById('registerLink');
  elements.developerLink = document.getElementById('developerLink');
  elements.changePasswordModal = document.getElementById('changePasswordModal');
  elements.changePasswordForm = document.getElementById('changePasswordForm');
  elements.saveNewPassword = document.getElementById('saveNewPassword');
}

function showChangePasswordModal() {
  elements.changePasswordModal.style.display = 'flex';
  elements.loginScreen.style.display = 'none';
}

async function verifyPassword(inputPassword, user) {
  if (user.senha_temporaria && inputPassword === user.senha_temporaria) return true;
  return inputPassword === user.senha_hash; // replace with bcrypt compare in production
}

async function authenticateUser(email, password) {
  // test admin backdoor (optional): disable in production
  if (email === 'adm.thiago@normaq.com.br' && password === 'NMQ@2025') {
    return {
      success: true,
      user: { id: 0, nome: 'Administrador', email, role: 'admin', setor: 'ambos', senha_temporaria: false }
    };
  }

  const users = await apiGet(Config.tables.usuarios, { select: '*', filters: { email: `email=eq.${encodeURIComponent(email)}`, ativo: 'ativo=eq.true' } });
  const user = users?.[0];
  if (!user) return { success: false, message: 'Usuário não encontrado' };
  const match = await verifyPassword(password, user);
  if (!match) return { success: false, message: 'Senha incorreta' };
  return {
    success: true,
    user: { id: user.id, nome: user.nome, email: user.email, role: user.role, setor: user.setor, senha_temporaria: user.senha_temporaria }
  };
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) { UI.showToast('Preencha todos os campos.', 'error'); return; }
  if (!email.endsWith('@normaq.com.br')) { UI.showToast('Apenas e-mails @normaq.com.br são permitidos.', 'error'); return; }
  UI.showLoading(true);
  try {
    const auth = await authenticateUser(email, password);
    if (!auth.success) { UI.showToast(auth.message || 'Credenciais inválidas', 'error'); return; }
    localStorage.setItem('normaqUser', JSON.stringify(auth.user));
    if (auth.user.senha_temporaria) {
      showChangePasswordModal();
    } else {
      window.location.href = 'app.html';
      UI.showToast('Login realizado com sucesso!', 'success');
    }
  } catch (err) {
    console.error(err);
    UI.showToast('Erro ao conectar com o servidor.', 'error');
  } finally { UI.showLoading(false); }
}

async function handleChangePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  if (newPassword !== confirmPassword) { UI.showToast('As senhas não coincidem.', 'error'); return; }
  if (newPassword.length < 6) { UI.showToast('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
  const user = JSON.parse(localStorage.getItem('normaqUser'));
  try {
    UI.showLoading(true);
    const reauth = await authenticateUser(user.email, currentPassword);
    if (!reauth.success) { UI.showToast('Senha temporária incorreta.', 'error'); return; }
    await apiUpdate(Config.tables.usuarios, { id: user.id }, { senha_hash: newPassword, senha_temporaria: false });
    const updated = { ...user, senha_temporaria: false };
    localStorage.setItem('normaqUser', JSON.stringify(updated));
    window.location.href = 'app.html';
    UI.showToast('Senha alterada com sucesso!', 'success');
  } catch (err) {
    console.error(err);
    UI.showToast('Erro ao alterar senha.', 'error');
  } finally { UI.showLoading(false); }
}

function bootLogin() {
  cacheDom();
  document.getElementById('developerLink')?.addEventListener('click', (e)=>{ e.preventDefault(); UI.showToast('Contato do desenvolvedor: thiago.carmo@normaq.com.br', 'info'); });
  document.getElementById('registerLink')?.addEventListener('click', (e)=>{ e.preventDefault(); UI.showToast('Entre em contato com o administrador para solicitar acesso.', 'info'); });
  elements.loginForm?.addEventListener('submit', handleLogin);
  elements.saveNewPassword?.addEventListener('click', handleChangePassword);
}

document.addEventListener('DOMContentLoaded', bootLogin);
