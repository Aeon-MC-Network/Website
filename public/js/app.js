/**
 * AeonMC Network v2 - Enterprise JAMstack Client Engine
 * Implements Action-Triggered Auto-Sync Reload Pattern for Static GitHub Pages
 */

const API_BASE_URL = window.API_BASE_URL || '/api';

const AppState = {
  currentUser: null,
  authToken: null,
  topLinks: []
};

// --- Auth Token Helpers ---
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

// --- Toast Notification Engine ---
function showToast(message, type = 'info', delayMs = 3500) {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100 shadow-emerald-500/20' :
                  type === 'error' ? 'bg-rose-950/95 border-rose-500/60 text-rose-100 shadow-rose-500/20' :
                  'bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-amber-500/20';

  toast.className = `pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-2 opacity-0 flex items-center justify-between gap-3 ${bgClass}`;
  toast.innerHTML = `
    <div class="flex items-center gap-2.5">
      <span class="text-lg font-bold">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="text-xs font-semibold">${message}</span>
    </div>
    <button onclick="this.parentElement.remove()" class="opacity-60 hover:opacity-100 text-xs">✕</button>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, delayMs);
}

// --- Telemetry Click Logger & Auto-Sync ---
async function trackTelemetryClick(linkDestination, linkTitle) {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/telemetry/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ link_destination: linkDestination, link_title: linkTitle })
      });
    } catch (err) {
      console.warn('Telemetry ping error:', err);
    }
  }
}

// --- Copy Server IP (play.aeonmc.com) ---
function copyServerIp() {
  const ipText = 'play.aeonmc.com';
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
    showToast('Server IP copied: play.aeonmc.com', 'success');
  }).catch(() => {
    showToast('Server IP: play.aeonmc.com', 'info');
  });
}

// --- Fetch User Profile & Capabilities ---
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
      fetchTopLinks();
      return data.user;
    } else {
      removeAuthToken();
      renderUserHeader(null);
      return null;
    }
  } catch (err) {
    console.warn('/api/auth/me offline, local session state maintained:', err);
    return null;
  }
}

// --- Fetch Top 9 Frequent Links Telemetry ---
async function fetchTopLinks() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/telemetry/top-links`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success && data.top_links) {
      AppState.topLinks = data.top_links;
      renderTopLinksDashboard(data.top_links);
    }
  } catch (err) {
    console.warn('Top links telemetry fetch error:', err);
  }
}

// --- Login Handler with Action Auto-Sync Reload ---
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

      closeModal('loginModal');
      showToast(`Welcome back, ${data.user.username}! Synchronizing page...`, 'success', 1500);

      // ACTION AUTO-SYNC: Reload page after action to guarantee 100% DB state on static GitHub Pages
      setTimeout(() => {
        window.location.reload();
      }, 800);

      return { success: true, user: data.user };
    } else {
      showToast(data.message || 'Invalid credentials.', 'error');
      return { success: false, message: data.message };
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('Failed to connect to authentication server.', 'error');
    return { success: false, message: 'Server connection failed.' };
  }
}

// --- Register Handler with Action Auto-Sync Reload ---
async function performRegister(username, email, password, ign, tosAccepted, marketingOptIn) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        ign: ign || username,
        tos_accepted: tosAccepted ? 1 : 0,
        marketing_opt_in: marketingOptIn ? 1 : 0
      })
    });

    const data = await response.json();

    if (data.success) {
      closeModal('registerModal');
      showToast(`Account created for ${data.user.username}! Synchronizing session...`, 'success', 1500);

      // Automatically login and trigger page reload sync
      return await performLogin(username, password);
    } else {
      showToast(data.message || 'Registration failed.', 'error');
      return { success: false, message: data.message };
    }
  } catch (err) {
    console.error('Registration error:', err);
    showToast('Failed to connect to registration server.', 'error');
    return { success: false, message: 'Server connection failed.' };
  }
}

// --- Logout Handler with Action Auto-Sync Reload ---
function handleLogout() {
  removeAuthToken();
  showToast('Logged out. Reloading session...', 'info', 1000);
  setTimeout(() => {
    window.location.reload();
  }, 600);
}

// --- Render Header User Profile Controls ---
function renderUserHeader(user) {
  const container = document.getElementById('userAuthContainer');
  if (!container) return;

  if (user) {
    const roleBadgeColor = (user.role_id === 1 || (user.role_name || '').toLowerCase() === 'founder') ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10' :
                           (user.role_id === 2 || (user.role_name || '').toLowerCase() === 'developer') ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' :
                           (user.role_id === 3 || (user.role_name || '').toLowerCase() === 'admin') ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' :
                           (user.role_id === 4 || (user.role_name || '').toLowerCase() === 'moderator') ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                           'bg-slate-800 text-slate-300 border-slate-700';

    const avatarUrl = user.avatar || `https://mc-heads.net/avatar/${encodeURIComponent(user.ign || user.username)}/100`;

    container.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${avatarUrl}" alt="${user.username}" class="w-8 h-8 rounded-lg border border-amber-500/40 shadow-md">
        <div class="hidden sm:flex flex-col text-left">
          <span class="text-xs font-bold text-amber-100">${user.username}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-extrabold ${roleBadgeColor}">
            ${user.role || user.role_name || 'Player'}
          </span>
        </div>
        <button onclick="handleLogout()" class="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-all shadow">
          Logout
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex items-center gap-2">
        <button onclick="openModal('loginModal')" class="px-3.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all shadow">
          Login
        </button>
        <button onclick="openModal('registerModal')" class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all">
          Register
        </button>
      </div>
    `;
  }
}

// --- Render Staff Navigation (Based on web_roles capability matrix) ---
function renderStaffNav(user) {
  const container = document.getElementById('staffNavContainer');
  if (!container) return;

  if (!user) {
    container.innerHTML = '';
    return;
  }

  const perms = user.permissions || {};
  const isStaff = user.role_id === 1 || user.role_id === 2 || user.role_id === 3 || user.role_id === 4 || perms.can_manage_wikis || perms.can_moderate_users;

  if (!isStaff) {
    container.innerHTML = '';
    return;
  }

  let links = [];

  if (perms.can_manage_wikis || user.role_id <= 4) {
    links.push(`<a href="wiki.html" onclick="trackTelemetryClick('wiki.html', 'Staff Wiki')" class="px-2.5 py-1 rounded-md text-xs font-medium text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 transition-all">Staff Wiki</a>`);
  }

  if (perms.can_moderate_users || user.role_id <= 3) {
    links.push(`<a href="https://plan.aeonmc.com" target="_blank" onclick="trackTelemetryClick('https://plan.aeonmc.com', 'Plan Analytics')" class="px-2.5 py-1 rounded-md text-xs font-medium text-purple-300 hover:bg-purple-500/15 border border-purple-500/30 transition-all">Plan Analytics</a>`);
  }

  if (user.role_id <= 3) {
    links.push(`<a href="staff.html" onclick="trackTelemetryClick('staff.html', 'Staff Portal')" class="px-2.5 py-1 rounded-md text-xs font-bold text-amber-400 hover:bg-amber-500/20 border border-amber-500/50 transition-all">Staff Portal</a>`);
  }

  container.innerHTML = `
    <div class="flex items-center gap-1.5 border-l border-amber-500/30 pl-3 my-1">
      <span class="text-[10px] uppercase tracking-widest text-amber-400/80 font-black hidden md:inline">Staff:</span>
      ${links.join('')}
    </div>
  `;
}

// --- Render Top-9 Telemetry Dashboard Grid ---
function renderTopLinksDashboard(topLinks) {
  const container = document.getElementById('topLinksGridContainer');
  if (!container) return;

  if (!topLinks || topLinks.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-6 text-xs text-slate-400">Click any link to start building your personalized Top 9 Frequent Destinations grid!</div>`;
    return;
  }

  container.innerHTML = topLinks.map((item, index) => `
    <a href="${item.link_destination}" target="${item.link_destination.startsWith('http') ? '_blank' : '_self'}"
       onclick="trackTelemetryClick('${item.link_destination}', '${item.link_title}')"
       class="glass-card p-3 rounded-xl hover:border-amber-500/60 transition-all flex items-center justify-between group">
      <div class="flex items-center gap-2.5 overflow-hidden">
        <span class="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-mono text-xs font-bold text-amber-300">#${index + 1}</span>
        <span class="text-xs font-semibold text-amber-100 group-hover:text-amber-400 transition-colors truncate">${item.link_title}</span>
      </div>
      <span class="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">${item.visit_count} clicks</span>
    </a>
  `).join('');
}

// --- Modal Utilities ---
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

// Global Window Exports
window.copyServerIp = copyServerIp;
window.performLogin = performLogin;
window.performRegister = performRegister;
window.handleLogout = handleLogout;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.trackTelemetryClick = trackTelemetryClick;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  fetchCurrentUser();

  // Attach login listener
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('loginUsername').value.trim();
      const passVal = document.getElementById('loginPassword').value.trim();
      await performLogin(userVal, passVal);
    });
  }

  // Attach register listener
  const regForm = document.getElementById('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('regUsername').value.trim();
      const emailVal = document.getElementById('regEmail').value.trim();
      const passVal = document.getElementById('regPassword').value.trim();
      const ignVal = document.getElementById('regIgn')?.value.trim() || userVal;
      const tosVal = document.getElementById('regTos')?.checked ?? true;
      const mktVal = document.getElementById('regMkt')?.checked ?? true;

      await performRegister(userVal, emailVal, passVal, ignVal, tosVal, mktVal);
    });
  }
});
