/**
 * AeonMC Network - Enterprise Frontend Client Script
 * Communicates with Vercel Serverless API (/api/auth/*) and Bloom MySQL
 */

const API_BASE_URL = window.API_BASE_URL || '/api';

const AppState = {
  currentUser: null,
  authToken: null
};

// --- Auth Token Management ---
function getAuthToken() {
  return localStorage.getItem('aeon_auth_token') || localStorage.getItem('aeon_session_token');
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem('aeon_auth_token', token);
    localStorage.setItem('aeon_session_token', token);
  }
}

function removeAuthToken() {
  localStorage.removeItem('aeon_auth_token');
  localStorage.removeItem('aeon_session_token');
  AppState.currentUser = null;
  AppState.authToken = null;
}

// --- Toast Notification Helper ---
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' :
                  type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' :
                  'bg-amber-950/90 border-amber-500/50 text-amber-200';

  toast.className = `pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-2 opacity-0 flex items-center justify-between gap-3 ${bgClass}`;
  toast.innerHTML = `
    <div class="flex items-center gap-2.5">
      <span class="text-lg">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="text-sm font-medium">${message}</span>
    </div>
    <button onclick="this.parentElement.remove()" class="opacity-60 hover:opacity-100 text-xs">✕</button>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Copy Server IP ---
function copyServerIp() {
  const ipText = 'smp.aeonmc.com';
  navigator.clipboard.writeText(ipText).then(() => {
    const btnText = document.getElementById('ipCopyBtnText');
    if (btnText) {
      const original = btnText.innerText;
      btnText.innerText = 'COPIED!';
      btnText.classList.add('text-amber-400');
      setTimeout(() => {
        btnText.innerText = original;
        btnText.classList.remove('text-amber-400');
      }, 2000);
    }
    showToast('Server IP copied to clipboard: smp.aeonmc.com', 'success');
  }).catch(() => {
    showToast('IP: smp.aeonmc.com', 'info');
  });
}

// --- Live User Authentication ---
async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) {
    renderUserHeader(null);
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      removeAuthToken();
      renderUserHeader(null);
      return null;
    }

    const data = await response.json();
    if (data.success && data.user) {
      AppState.currentUser = data.user;
      AppState.authToken = token;
      renderUserHeader(data.user);
      renderStaffNav(data.user);
      return data.user;
    } else {
      removeAuthToken();
      renderUserHeader(null);
      return null;
    }
  } catch (err) {
    console.warn('API /api/auth/me unreachable, maintaining session state:', err);
    return null;
  }
}

async function performLogin(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success && data.user) {
      const token = data.jwtToken || data.token;
      setAuthToken(token);
      AppState.currentUser = data.user;
      AppState.authToken = token;

      closeModal('loginModal');
      renderUserHeader(data.user);
      renderStaffNav(data.user);
      showToast(`Welcome back, ${data.user.username}!`, 'success');
      return { success: true, user: data.user };
    } else {
      showToast(data.message || 'Invalid credentials.', 'error');
      return { success: false, message: data.message };
    }
  } catch (err) {
    console.error('Login request error:', err);
    showToast('Failed to connect to authentication server.', 'error');
    return { success: false, message: 'Server connection failed.' };
  }
}

async function performRegister(username, email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (data.success) {
      closeModal('registerModal');
      showToast(`Account created for ${data.user.username}! Logging in...`, 'success');
      return await performLogin(username, password);
    } else {
      showToast(data.message || 'Registration failed.', 'error');
      return { success: false, message: data.message };
    }
  } catch (err) {
    console.error('Registration request error:', err);
    showToast('Failed to connect to registration server.', 'error');
    return { success: false, message: 'Server connection failed.' };
  }
}

function handleLogout() {
  removeAuthToken();
  renderUserHeader(null);
  renderStaffNav(null);
  showToast('Logged out successfully.', 'info');
}

// --- Render User Controls in Header ---
function renderUserHeader(user) {
  const container = document.getElementById('userAuthContainer');
  if (!container) return;

  if (user) {
    const roleBadgeColor = (user.role_name === 'founder' || user.role === 'Admin') ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                           (user.role_name === 'developer') ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                           (user.role_name === 'moderator' || user.role === 'Mod') ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                           'bg-slate-800 text-slate-300 border-slate-700';

    container.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${user.avatar || `https://mc-heads.net/avatar/${user.username}/100`}" alt="${user.username}" class="w-8 h-8 rounded-lg border border-amber-500/30 shadow-md">
        <div class="hidden sm:flex flex-col text-left">
          <span class="text-xs font-semibold text-amber-100">${user.username}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${roleBadgeColor}">
            ${user.role || user.role_name || 'Player'}
          </span>
        </div>
        <button onclick="handleLogout()" class="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-200 text-xs font-medium transition-all shadow">
          Logout
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex items-center gap-2">
        <button onclick="openModal('loginModal')" class="px-3.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-amber-200 text-xs font-semibold transition-all">
          Login
        </button>
        <button onclick="openModal('registerModal')" class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all">
          Register
        </button>
      </div>
    `;
  }
}

// --- Render Staff Navigation Links ---
function renderStaffNav(user) {
  const staffNavContainer = document.getElementById('staffNavContainer');
  if (!staffNavContainer) return;

  if (!user) {
    staffNavContainer.innerHTML = '';
    return;
  }

  const perms = user.permissions || {};
  const isStaff = user.role_name === 'founder' || user.role_name === 'admin' || user.role_name === 'developer' || user.role_name === 'moderator' || perms.staff_wiki || perms.plan_analytics;

  if (!isStaff) {
    staffNavContainer.innerHTML = '';
    return;
  }

  let links = [];

  if (perms.staff_wiki || user.role_name === 'founder' || user.role_name === 'admin' || user.role_name === 'developer' || user.role_name === 'moderator') {
    links.push(`<a href="wiki.html" class="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-all">Staff Wiki</a>`);
  }

  if (perms.plan_analytics || user.role_name === 'founder' || user.role_name === 'admin' || user.role_name === 'developer') {
    links.push(`<a href="https://plan.aeonmc.com" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 hover:bg-purple-500/10 border border-purple-500/20 transition-all">Plan Analytics</a>`);
  }

  if (user.role_name === 'founder' || user.role_name === 'admin' || user.role_name === 'developer' || user.role_name === 'moderator') {
    links.push(`<a href="staff.html" class="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-500/20 border border-amber-500/40 transition-all">Staff Dashboard</a>`);
  }

  staffNavContainer.innerHTML = `
    <div class="flex items-center gap-2 border-l border-amber-500/20 pl-3 my-1">
      <span class="text-[10px] uppercase tracking-wider text-amber-400/70 font-bold hidden md:inline">Staff:</span>
      ${links.join('')}
    </div>
  `;
}

// --- Modal Helper Functions ---
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Global Exports
window.copyServerIp = copyServerIp;
window.performLogin = performLogin;
window.performRegister = performRegister;
window.handleLogout = handleLogout;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  fetchCurrentUser();

  // Attach login form submission listener
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('loginUsername').value.trim();
      const passVal = document.getElementById('loginPassword').value.trim();
      await performLogin(userVal, passVal);
    });
  }

  // Attach register form submission listener
  const regForm = document.getElementById('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('regUsername').value.trim();
      const emailVal = document.getElementById('regEmail').value.trim();
      const passVal = document.getElementById('regPassword').value.trim();
      await performRegister(userVal, emailVal, passVal);
    });
  }
});
