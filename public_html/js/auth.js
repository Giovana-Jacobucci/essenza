/* ============================================================
   ESSENZA — Auth Module
   Login, registro, sessão e menu de usuário
   ============================================================ */

const EssenzaAuth = (() => {
  let currentUser = null;
  let csrfToken = '';

  /* ── API Helper ── */
  async function api(url, options = {}) {
    const defaults = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (csrfToken && options.method && options.method !== 'GET') {
      defaults.headers['X-CSRF-Token'] = csrfToken;
    }
    const res = await fetch(url, { ...defaults, ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  }

  /* ── Verificar sessão ao carregar ── */
  async function checkSession() {
    try {
      const data = await api('/api/auth/me');
      currentUser = data.user;
      csrfToken = data.csrf_token || '';
      updateUI();
      return currentUser;
    } catch {
      currentUser = null;
      updateUI();
      return null;
    }
  }

  /* ── Login ── */
  async function login(identifier, password) {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    currentUser = data.user;
    csrfToken = data.csrf_token || '';
    updateUI();

    // Mesclar carrinho de sessão
    try { await api('/api/cart/merge', { method: 'POST' }); } catch {}

    return data;
  }

  /* ── Registro ── */
  async function register(formData) {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    currentUser = data.user;
    csrfToken = data.csrf_token || '';
    updateUI();
    return data;
  }

  /* ── Logout ── */
  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    currentUser = null;
    csrfToken = '';
    updateUI();
    window.location.href = '/';
  }

  /* ── Atualizar UI do header ── */
  function updateUI() {
    const userMenu = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const authActions = document.getElementById('authActions');
    const adminLink = document.getElementById('adminNavLink');

    if (!userMenu) return;

    if (currentUser) {
      // Logado — mostrar menu do usuário
      const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      userMenu.innerHTML = `<span class="user-avatar-sm">${initials}</span>`;
      userMenu.title = currentUser.name;

      if (userDropdown) {
        userDropdown.querySelector('.user-dropdown-name').textContent = currentUser.name;
        userDropdown.querySelector('.user-dropdown-email').textContent = currentUser.email;
      }

      if (authActions) authActions.style.display = 'none';
      if (adminLink) adminLink.style.display = currentUser.role === 'admin' ? '' : 'none';
    } else {
      // Deslogado — mostrar ícone genérico
      userMenu.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      userMenu.title = 'Entrar / Cadastrar';

      if (authActions) authActions.style.display = '';
      if (adminLink) adminLink.style.display = 'none';
    }
  }

  /* ── Toggle dropdown ── */
  function initDropdown() {
    const btn = document.getElementById('userMenuBtn');
    const dropdown = document.getElementById('userDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentUser) {
        openModal('loginModal');
        return;
      }
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      if (dropdown) dropdown.classList.remove('open');
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  }

  /* ── Modais ── */
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      const firstInput = modal.querySelector('input');
      if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function initModals() {
    // Fechar modal ao clicar no overlay
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal.id);
      });
    });

    // Botões de fechar
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });

    // Alternar entre login e registro
    document.querySelectorAll('[data-switch-modal]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const from = link.closest('.modal-overlay').id;
        closeModal(from);
        setTimeout(() => openModal(link.dataset.switchModal), 200);
      });
    });

    // Botões para abrir login
    document.querySelectorAll('[data-open-login]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); openModal('loginModal'); });
    });

    document.querySelectorAll('[data-open-register]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); openModal('registerModal'); });
    });

    // Fechar com Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
      }
    });

    // Form de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button[type="submit"]');
        const errorEl = loginForm.querySelector('.form-error');
        btn.disabled = true;
        btn.textContent = 'Entrando…';
        if (errorEl) errorEl.textContent = '';

        try {
          const identifier = loginForm.querySelector('#loginIdentifier').value.trim();
          const password = loginForm.querySelector('#loginPassword').value;
          await login(identifier, password);
          closeModal('loginModal');
          loginForm.reset();
          if (window.EssenzaApp) EssenzaApp.showToast('Login realizado com sucesso!', '✓');
        } catch (err) {
          if (errorEl) errorEl.textContent = err.message;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Entrar';
        }
      });
    }

    // Form de registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registerForm.querySelector('button[type="submit"]');
        const errorEl = registerForm.querySelector('.form-error');
        btn.disabled = true;
        btn.textContent = 'Cadastrando…';
        if (errorEl) errorEl.textContent = '';

        try {
          const formData = {
            name:       registerForm.querySelector('#registerName').value.trim(),
            email:      registerForm.querySelector('#registerEmail').value.trim(),
            cpf:        registerForm.querySelector('#registerCpf').value.trim(),
            phone:      registerForm.querySelector('#registerPhone').value.trim(),
            birth_date: registerForm.querySelector('#registerBirthDate').value || null,
            password:   registerForm.querySelector('#registerPassword').value,
          };

          if (!validateCPF(formData.cpf)) {
            throw new Error('CPF inválido');
          }

          if (formData.phone && !validatePhone(formData.phone)) {
            throw new Error('Telefone inválido');
          }

          const confirmPass = registerForm.querySelector('#registerConfirmPassword').value;
          if (formData.password !== confirmPass) {
            throw new Error('As senhas não conferem');
          }

          await register(formData);
          closeModal('registerModal');
          registerForm.reset();
          if (window.EssenzaApp) EssenzaApp.showToast('Cadastro realizado com sucesso! Bem-vinda!', '🎉');
        } catch (err) {
          if (errorEl) errorEl.textContent = err.message;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Criar Conta';
        }
      });
    }
  }

  /* ── CPF and Phone Validation Helpers ── */
  function validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    for (let t = 9; t < 11; t++) {
      let d = 0;
      for (let c = 0; c < t; c++) {
        d += cpf[c] * ((t + 1) - c);
      }
      d = ((10 * d) % 11) % 10;
      if (cpf[t] != d) return false;
    }
    return true;
  }

  function validatePhone(phone) {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10 && digits.length !== 11) return false;
    const ddd = parseInt(digits.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) return false;
    if (digits.length === 11 && digits[2] !== '9') return false;
    return true;
  }

  /* ── CPF mask ── */
  function initCpfMask() {
    document.querySelectorAll('[data-mask="cpf"]').forEach(input => {
      input.addEventListener('input', () => {
        let v = input.value.replace(/\D/g, '').slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        input.value = v;
      });
    });
  }

  /* ── Phone mask ── */
  function initPhoneMask() {
    document.querySelectorAll('[data-mask="phone"]').forEach(input => {
      input.addEventListener('input', () => {
        let v = input.value.replace(/\D/g, '').slice(0, 11);
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
        input.value = v;
      });
    });
  }

  /* ── Init ── */
  function init() {
    initDropdown();
    initModals();
    initCpfMask();
    initPhoneMask();
    checkSession();
  }

  return {
    init,
    login,
    register,
    logout,
    checkSession,
    getUser: () => currentUser,
    getCsrfToken: () => csrfToken,
    isLoggedIn: () => !!currentUser,
    isAdmin: () => currentUser?.role === 'admin',
    validateCPF,
    validatePhone,
    openModal,
    closeModal,
    api,
  };
})();

document.addEventListener('DOMContentLoaded', EssenzaAuth.init);
