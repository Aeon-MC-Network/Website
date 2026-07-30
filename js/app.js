/**
 * AeonMC - Client Engine
 * Implements Unified Auth Modals, Safe API Client, and Action Auto-Sync Reload Pattern
 */

function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    if (window.API_BASE_URL) return window.API_BASE_URL;
    if (localStorage.getItem('aeon_api_url')) return localStorage.getItem('aeon_api_url');

    const host = window.location.hostname.toLowerCase();
    if (host.includes('github.io') || host.includes('aeonmc.com')) {
      return 'https://aeonmc-website.vercel.app/api';
    }
  }
  return '/api';
}

const AppState = {
  currentUser: null,
  authToken: null,
  topLinks: []
};

/**
 * Safe API Fetch Wrapper
 * Validates res.ok and content-type header before parsing JSON to prevent SyntaxError on static HTML 404 fallbacks
 */
async function safeApiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const res = await fetch(fullUrl, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      console.warn(`[API] Endpoint '${endpoint}' returned non-JSON content-type '${contentType || 'HTML'}'. Using fallback client mode.`);
      return { ok: false, status: res.status, isHtmlFallback: true, data: null };
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return { ok: false, status: res.status, data: errData };
    }

    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err) {
    console.warn(`[API] Network failure fetching '${endpoint}':`, err);
    return { ok: false, status: 0, isNetworkError: true, data: null };
  }
}

// Ensure safeApiFetch can be exported for other modules if needed
export { safeApiFetch };

// --- Live Minecraft Server Query API Status ---
async function fetchMinecraftServerStatus() {
  const badgeElement = document.getElementById('playerCountBadge');
  
  try {
    const res = await fetch('/api/server-status');
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        const online = data.online || 0;
        const max = data.max || 500;
        if (badgeElement) {
          badgeElement.innerHTML = `
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online: ${online} / ${max} Players
          `;
        }
        return;
      }
    }
    
    if (badgeElement) {
      badgeElement.innerHTML = `
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        Server Online: play.aeonmc.com
      `;
    }
  } catch (err) {
    console.warn('Server status query:', err);
    if (badgeElement) {
      badgeElement.innerHTML = `
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        Server Online: play.aeonmc.com
      `;
    }
  }
}

// --- Persistent Auth Token Helpers (localStorage + Cookie) ---
function getAuthToken() {
  const localToken = localStorage.getItem('aeon_auth_token') || localStorage.getItem('aeon_session_token');
  if (localToken) return localToken;

  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    const [name, val] = c.trim().split('=');
    if ((name === 'aeon_auth_token' || name === 'aeon_session_token') && val) {
      return decodeURIComponent(val);
    }
  }
  return null;
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem('aeon_auth_token', token);
    localStorage.setItem('aeon_session_token', token);
    document.cookie = `aeon_auth_token=${encodeURIComponent(token)}; Path=/; Max-Age=604800; SameSite=Lax`;
  }
}

function removeAuthToken() {
  localStorage.removeItem('aeon_auth_token');
  localStorage.removeItem('aeon_session_token');
  document.cookie = 'aeon_auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
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

// --- Telemetry Click Logger ---
async function trackTelemetryClick(linkDestination, linkTitle) {
  const token = getAuthToken();
  if (token) {
    await safeApiFetch('/telemetry/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ link_destination: linkDestination, link_title: linkTitle })
    });
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

  const res = await safeApiFetch('/auth/me', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (res.ok && res.data && res.data.success && res.data.user) {
    AppState.currentUser = res.data.user;
    AppState.authToken = token;
    renderUserHeader(res.data.user);
    renderStaffNav(res.data.user);
    fetchTopLinks();
    return res.data.user;
  } else {
    if (!res.isHtmlFallback) removeAuthToken();
    renderUserHeader(null);
    return null;
  }
}

// --- Fetch Top 9 Frequent Links Telemetry ---
async function fetchTopLinks() {
  const token = getAuthToken();
  if (!token) return;

  const res = await safeApiFetch('/telemetry/top-links', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (res.ok && res.data && res.data.success && res.data.top_links) {
    AppState.topLinks = res.data.top_links;
    renderTopLinksDashboard(res.data.top_links);
  }
}

// --- Refactored Login Handler ---
async function performLogin(username, password) {
  const cleanUsername = (username || '').trim();
  const cleanPassword = (password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    showToast('Please enter both your username and password.', 'error');
    return { success: false, message: 'Missing fields' };
  }

  const res = await safeApiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
  });

  if (res.ok && res.data && res.data.success && res.data.user) {
    const token = res.data.jwtToken || res.data.token || res.data.sessionToken;
    setAuthToken(token);
    AppState.currentUser = res.data.user;

    closeModal('loginModal');
    closeModal('registerModal');
    showToast(`Welcome back, ${res.data.user.username}! Synchronizing session...`, 'success', 1500);

    setTimeout(() => {
      window.location.reload();
    }, 800);

    return { success: true, user: res.data.user };
  } else {
    const errMsg = res.data?.message || (res.isHtmlFallback ? 'Backend API unavailable on static domain. Set window.API_BASE_URL to live Vercel backend endpoint.' : 'Invalid username or password.');
    showToast(errMsg, 'error');
    return { success: false, message: errMsg };
  }
}

// --- Refactored Register Handler ---
async function performRegister(username, email, password, ign, tosAccepted, marketingOptIn) {
  const cleanUsername = (username || '').trim();
  const cleanEmail = (email || '').trim();
  const cleanPassword = (password || '').trim();
  const cleanIgn = (ign || cleanUsername).trim();

  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    showToast('Please fill out all required fields.', 'error');
    return { success: false, message: 'Missing fields' };
  }

  if (cleanUsername.length < 3 || cleanUsername.length > 32) {
    showToast('Username must be between 3 and 32 characters.', 'error');
    return { success: false, message: 'Invalid username length' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    showToast('Please enter a valid email address.', 'error');
    return { success: false, message: 'Invalid email format' };
  }

  if (cleanPassword.length < 6) {
    showToast('Password must be at least 6 characters long.', 'error');
    return { success: false, message: 'Short password' };
  }

  if (!tosAccepted) {
    showToast('You must accept the Terms of Service to register.', 'error');
    return { success: false, message: 'ToS unaccepted' };
  }

  const res = await safeApiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
      ign: cleanIgn,
      tos_accepted: tosAccepted ? 1 : 0,
      marketing_opt_in: marketingOptIn ? 1 : 0
    })
  });

  if (res.ok && res.data && res.data.success) {
    closeModal('registerModal');
    showToast(`Account created for ${res.data.user.username}! Synchronizing session...`, 'success', 1500);
    return await performLogin(cleanUsername, cleanPassword);
  } else {
    const errMsg = res.data?.message || (res.isHtmlFallback ? 'Backend API unavailable on static domain.' : 'Registration failed.');
    showToast(errMsg, 'error');
    return { success: false, message: errMsg };
  }
}

// --- Forum Thread Creation ---
async function createThread(categoryId, title, contentHtml) {
  const token = getAuthToken();
  if (!token) {
    showToast('Please login to create a thread.', 'error');
    openModal('loginModal');
    return;
  }

  const res = await safeApiFetch('/forms/threads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ category_id: categoryId, title, content_html: contentHtml })
  });

  if (res.ok && res.data && res.data.success) {
    showToast('Thread created! Synchronizing...', 'success', 1500);
    setTimeout(() => window.location.reload(), 800);
  } else {
    showToast(res.data?.message || 'Thread creation failed.', 'error');
  }
}

// --- Forum Thread Pinning ---
async function pinThread(threadId, keepForever) {
  const token = getAuthToken();
  if (!token) return;

  const res = await safeApiFetch('/forms/pin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ thread_id: threadId, keep_forever: keepForever ? 1 : 0 })
  });

  if (res.ok && res.data && res.data.success) {
    showToast(res.data.message || 'Thread updated! Synchronizing...', 'success', 1500);
    setTimeout(() => window.location.reload(), 800);
  } else {
    showToast(res.data?.message || 'Staff action failed.', 'error');
  }
}

// --- Rank Admin Promotion ---
async function setRank(targetUsername, newRole) {
  const token = getAuthToken();
  if (!token) return;

  const res = await safeApiFetch('/ranks/set-rank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ targetUsername, newRole })
  });

  if (res.ok && res.data && res.data.success) {
    showToast(res.data.message || 'Rank updated! Reloading state...', 'success', 1500);
    setTimeout(() => window.location.reload(), 800);
  } else {
    showToast(res.data?.message || 'Rank update failed.', 'error');
  }
}

// --- Logout Handler ---
function handleLogout() {
  removeAuthToken();
  showToast('Logged out. Reloading session...', 'info', 1000);
  setTimeout(() => {
    window.location.reload();
  }, 600);
}

// --- Render Header User Controls ---
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
        <button id="logoutBtn" class="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-all shadow">
          Logout
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex items-center gap-2">
        <button id="headerLoginBtn" class="px-3.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all shadow">
          Login
        </button>
        <button id="headerRegisterBtn" class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all">
          Register
        </button>
      </div>
    `;
  }
}

// --- Render Staff Navigation ---
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
    links.push(`<a href="wiki.html" data-telemetry-link="wiki.html" data-telemetry-title="Staff Wiki" class="px-2.5 py-1 rounded-md text-xs font-medium text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 transition-all">Staff Wiki</a>`);
  }

  if (perms.can_moderate_users || user.role_id <= 4) {
    links.push(`<a href="https://plan.aeonmc.com:8804" target="_blank" rel="noopener" data-telemetry-link="https://plan.aeonmc.com:8804" data-telemetry-title="Plan Analytics" class="px-2.5 py-1 rounded-md text-xs font-medium text-purple-300 hover:bg-purple-500/15 border border-purple-500/30 transition-all">Plan Analytics</a>`);
  }

  if (user.role_id <= 3) {
    links.push(`<a href="staff.html" data-telemetry-link="staff.html" data-telemetry-title="Staff Portal" class="px-2.5 py-1 rounded-md text-xs font-bold text-amber-400 hover:bg-amber-500/20 border border-amber-500/50 transition-all">Staff Portal</a>`);
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
       data-telemetry-link="${item.link_destination}" data-telemetry-title="${item.link_title}"
       class="glass-card p-3 rounded-xl hover:border-amber-500/60 transition-all flex items-center justify-between group">
      <div class="flex items-center gap-2.5 overflow-hidden">
        <span class="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-mono text-xs font-bold text-amber-300">#${index + 1}</span>
        <span class="text-xs font-semibold text-amber-100 group-hover:text-amber-400 transition-colors truncate">${item.link_title}</span>
      </div>
      <span class="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">${item.visit_count} clicks</span>
    </a>
  `).join('');
}

// --- Robust Modal Utilities ---
function openModal(id) {
  if (id === 'registerModal') {
    const regModal = document.getElementById('registerModal');
    if (regModal) {
      closeModal('loginModal');
      regModal.classList.remove('hidden');
      regModal.classList.add('flex');
      return;
    }
  }

  if (id === 'loginModal') {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
      closeModal('registerModal');
      loginModal.classList.remove('hidden');
      loginModal.classList.add('flex');
      return;
    }
  }

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

// Modal accessibility keyboard support
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal('loginModal');
    closeModal('registerModal');
  }
});

// Global Event Delegation for clicks
document.addEventListener('click', (e) => {
  // Telemetry Links
  const telemetryLink = e.target.closest('[data-telemetry-link]');
  if (telemetryLink) {
    trackTelemetryClick(telemetryLink.getAttribute('data-telemetry-link'), telemetryLink.getAttribute('data-telemetry-title'));
  }
  
  // Copy IP Button
  if (e.target.closest('#copyIpBtn')) {
    copyServerIp();
  }
  
  // Header Buttons
  if (e.target.closest('#headerLoginBtn')) {
    openModal('loginModal');
  }
  if (e.target.closest('#headerRegisterBtn')) {
    openModal('registerModal');
  }
  
  // Modal switch buttons
  if (e.target.closest('#switchToRegisterBtn')) {
    closeModal('loginModal');
    openModal('registerModal');
  }
  if (e.target.closest('#switchToLoginBtn')) {
    closeModal('registerModal');
    openModal('loginModal');
  }
  
  // Logout Button
  if (e.target.closest('#logoutBtn')) {
    handleLogout();
  }
});

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  fetchCurrentUser();
  fetchMinecraftServerStatus();
  setInterval(fetchMinecraftServerStatus, 60000);

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

