/**
 * AeonMC Platform - Core UI Controller & Navigation Manager
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  init() {
    this.renderHeader();
    this.renderFooter();
    this.bindGlobalEvents();
    this.bindAccessibilityEvents();
    this.fetchLiveServerStatus();
    
    // Auto refresh status every 30 seconds
    setInterval(() => {
      this.fetchLiveServerStatus();
    }, 30000);
  },

  renderHeader() {
    const headerContainer = document.getElementById('mainHeader');
    if (!headerContainer) return;

    const user = Auth.getCurrentUser();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const isStaff = Auth.isStaff();
    const role = Auth.getRole();

    const roleBadgeClasses = {
      'Admin': 'bg-rose-950/80 border-rose-500/50 text-rose-400',
      'Mod': 'bg-amber-950/80 border-amber-500/50 text-amber-400',
      'Content Creator': 'bg-purple-950/80 border-purple-500/50 text-purple-400',
      'Player': 'bg-indigo-950/80 border-indigo-500/50 text-indigo-400'
    };

    const userBadgeClass = roleBadgeClasses[role] || 'bg-slate-800 text-slate-300';

    const navLinks = [
      { name: 'Home', href: 'index.html' },
      { name: 'Vote', href: 'vote.html' },
      { name: 'Forums', href: 'forums.html' },
      { name: 'News', href: 'news.html' },
      { name: 'Media', href: 'media.html' },
      { name: 'Wiki', href: 'wiki.html' },
      { name: 'Contact', href: 'contact.html' }
    ];

    if (isStaff) {
      navLinks.push({ name: 'Staff Portal', href: 'staff.html', isStaffOnly: true });
    }

    const navItemsHTML = navLinks.map(link => {
      const isActive = currentPage === link.href || (currentPage === '' && link.href === 'index.html');
      const staffStyle = link.isStaffOnly ? 'text-amber-400 hover:text-amber-300 font-bold' : '';
      return `
        <a href="${link.href}" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${staffStyle} ${isActive ? 'text-white bg-indigo-600/20 border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}">
          ${link.isStaffOnly ? '<i class="fas fa-shield-alt mr-1"></i>' : ''}${link.name}
        </a>
      `;
    }).join('');

    const mobileNavItemsHTML = navLinks.map(link => {
      const isActive = currentPage === link.href;
      return `
        <a href="${link.href}" class="block px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'text-white bg-indigo-600/30 border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800'}">
          ${link.isStaffOnly ? '<i class="fas fa-shield-alt text-amber-400 mr-2"></i>' : ''}${link.name}
        </a>
      `;
    }).join('');

    const authWidgetHTML = user ? `
      <div class="relative inline-block text-left">
        <button id="userMenuBtn" aria-haspopup="true" aria-expanded="false" class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
          <img src="${user.avatar}" alt="${user.username}" class="w-7 h-7 rounded-full bg-slate-800 border border-slate-700">
          <span class="text-xs sm:text-sm font-semibold text-white">${user.username}</span>
          <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${userBadgeClass}">${role}</span>
          <i class="fas fa-chevron-down text-[10px] text-slate-400"></i>
        </button>

        <div id="userMenuDropdown" role="menu" class="hidden absolute right-0 mt-2 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50">
          <div class="px-3 py-2 text-[11px] text-slate-400 border-b border-slate-800/80">
            Logged in as <strong class="text-white">${user.username}</strong>
          </div>

          <button onclick="App.openProfileModal()" role="menuitem" class="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <i class="fas fa-user-cog text-indigo-400"></i> Profile & Settings
          </button>

          ${isStaff ? `
            <a href="staff.html" role="menuitem" class="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-slate-800 rounded-lg transition-colors">
              <i class="fas fa-shield-alt"></i> Staff Portal
            </a>
          ` : ''}

          <button onclick="App.handleLogout()" role="menuitem" class="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-slate-800 rounded-lg transition-colors border-t border-slate-800/80 mt-1 pt-2">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
    ` : `
      <div class="flex items-center gap-2">
        <button onclick="App.openLoginModal()" class="px-4 py-2 rounded-full text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all">Login</button>
        <button onclick="App.openRegisterModal()" class="px-4 py-2 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all">Register</button>
      </div>
    `;

    headerContainer.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <!-- Logo -->
        <a href="index.html" class="flex items-center gap-2.5 shrink-0" aria-label="AeonMC Homepage">
          <img src="assets/img/logo.jpg" alt="AeonMC Logo" class="w-9 h-9 rounded-xl object-cover border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
          <div class="flex items-center text-xl tracking-tight">
            <span class="font-extrabold text-white">AEON</span>
            <span class="font-extrabold text-indigo-500 ml-0.5">MC</span>
          </div>
        </a>

        <!-- Desktop Links -->
        <nav class="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
          ${navItemsHTML}
        </nav>

        <!-- Header Right Actions -->
        <div class="flex items-center gap-3">
          <a href="https://aeon-mc.tebex.store/" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all">
            <i class="fas fa-shopping-cart"></i> Store
          </a>
          ${authWidgetHTML}

          <!-- Mobile Hamburger Toggle -->
          <button id="mobileMenuBtn" aria-label="Toggle Navigation Menu" class="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white">
            <i class="fas fa-bars text-base"></i>
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Navigation -->
      <div id="mobileNavContainer" class="hidden lg:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-4 py-4 space-y-2">
        ${mobileNavItemsHTML}
        <a href="https://aeon-mc.tebex.store/" target="_blank" rel="noopener noreferrer" class="block w-full py-2.5 rounded-xl text-center font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md">
          <i class="fas fa-shopping-cart mr-2"></i> Visit Store
        </a>
      </div>
    `;

    // Dropdown toggle
    const dropdownBtn = document.getElementById('userMenuBtn');
    const dropdownMenu = document.getElementById('userMenuDropdown');
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = dropdownBtn.getAttribute('aria-expanded') === 'true';
        dropdownBtn.setAttribute('aria-expanded', !expanded);
        dropdownMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', () => {
        dropdownMenu.classList.add('hidden');
        dropdownBtn.setAttribute('aria-expanded', 'false');
      });
    }

    // Mobile menu listener
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileContainer = document.getElementById('mobileNavContainer');
    if (mobileBtn && mobileContainer) {
      mobileBtn.addEventListener('click', () => {
        mobileContainer.classList.toggle('hidden');
      });
    }
  },

  renderFooter() {
    const footerContainer = document.getElementById('mainFooter');
    if (!footerContainer) return;

    footerContainer.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div class="text-xs text-slate-500">
          &copy; 2026 <span class="font-semibold text-slate-300">AeonMC Network</span>. All rights reserved.
        </div>
        <div class="text-[11px] text-slate-600 max-w-md">
          Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
        </div>
      </div>
    `;
  },

  bindGlobalEvents() {
    document.querySelectorAll('[data-copy-ip]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.copyServerIP();
      });
    });
  },

  /* Requirement 3: Accessibility Escape Key Listener & Modal Focus Trapping */
  bindAccessibilityEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  },

  closeAllModals() {
    document.querySelectorAll('[id$="Modal"]').forEach(modal => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  },

  copyServerIP() {
    const settings = StorageDB.get(STORAGE_KEYS.SETTINGS) || DEFAULT_SETTINGS;
    const ip = settings.serverIP || 'play.aeonmc.com';

    navigator.clipboard.writeText(ip).then(() => {
      this.showToast(`Server IP copied: ${ip}`, 'success');
      
      const btnText = document.getElementById('copyBtnText');
      const btnIcon = document.getElementById('copyBtnIcon');
      const btn = document.getElementById('copyIpBtn');

      if (btnText && btn) {
        btnText.textContent = "Copied!";
        if (btnIcon) btnIcon.className = "fas fa-check text-xs";
        btn.classList.add('bg-emerald-500', 'hover:bg-emerald-400', 'text-slate-950');

        setTimeout(() => {
          btnText.textContent = "Copy IP";
          if (btnIcon) btnIcon.className = "fas fa-copy text-xs";
          btn.classList.remove('bg-emerald-500', 'hover:bg-emerald-400', 'text-slate-950');
        }, 2000);
      }
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
    });
  },

  async fetchLiveServerStatus() {
    const settings = StorageDB.get(STORAGE_KEYS.SETTINGS) || DEFAULT_SETTINGS;
    const serverHost = settings.serverIP || 'play.aeonmc.com';

    const statusText = document.getElementById('statusText');
    const playerCountText = document.getElementById('playerCountText');

    if (!statusText && !playerCountText) return;

    try {
      const res = await fetch(`https://api.mcsrvstat.us/3/${serverHost}`);
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          this.updateStatusUI(true, data.players ? data.players.online : 0, data.players ? data.players.max : 2000);
          return;
        }
      }
    } catch (e) {
      console.warn('mcsrvstat.us v3 ping failed, trying fallback...', e);
    }

    try {
      const resFB = await fetch(`https://api.mcstatus.io/v2/status/java/${serverHost}`);
      if (resFB.ok) {
        const dataFB = await resFB.json();
        if (dataFB.online) {
          this.updateStatusUI(true, dataFB.players ? dataFB.players.online : 0, dataFB.players ? dataFB.players.max : 2000);
          return;
        }
      }
    } catch (e) {
      console.warn('mcstatus.io ping failed:', e);
    }

    this.updateStatusUI(false, 0, 2000);
  },

  updateStatusUI(isOnline, onlineCount, maxCount) {
    const statusText = document.getElementById('statusText');
    const playerCountText = document.getElementById('playerCountText');
    const pingDot = document.getElementById('statusPingDot');
    const pingPulse = document.getElementById('statusPingPulse');

    if (!statusText) return;

    if (isOnline) {
      statusText.textContent = "ONLINE";
      statusText.className = "font-bold text-emerald-400";
      if (playerCountText) playerCountText.textContent = `${onlineCount} / ${maxCount} Players`;
      if (pingDot) pingDot.className = "relative inline-flex rounded-full h-3 w-3 bg-emerald-500";
      if (pingPulse) pingPulse.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
    } else {
      statusText.textContent = "OFFLINE";
      statusText.className = "font-bold text-rose-400";
      if (playerCountText) playerCountText.textContent = `0 / ${maxCount} Players`;
      if (pingDot) pingDot.className = "relative inline-flex rounded-full h-3 w-3 bg-rose-500";
      if (pingPulse) pingPulse.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75";
    }
  },

  openLoginModal() {
    let modal = document.getElementById('authModal');
    if (!modal) {
      this.createAuthModal();
      modal = document.getElementById('authModal');
    }
    document.getElementById('modalTitle').textContent = 'Account Login';
    document.getElementById('loginFormContainer').classList.remove('hidden');
    document.getElementById('registerFormContainer').classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  openRegisterModal() {
    let modal = document.getElementById('authModal');
    if (!modal) {
      this.createAuthModal();
      modal = document.getElementById('authModal');
    }
    document.getElementById('modalTitle').textContent = 'Create AeonMC Account';
    document.getElementById('loginFormContainer').classList.add('hidden');
    document.getElementById('registerFormContainer').classList.remove('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  createAuthModal() {
    const modalHTML = `
      <div id="authModal" role="dialog" aria-modal="true" class="hidden fixed inset-0 z-50 items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
          <button onclick="App.closeAuthModal()" aria-label="Close Modal" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fas fa-times"></i></button>
          
          <h2 id="modalTitle" class="text-xl font-bold text-white mb-6">Account Login</h2>

          <!-- Clean Login Form -->
          <div id="loginFormContainer">
            <form onsubmit="App.handleLoginSubmit(event)" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <input type="text" id="loginUsername" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none" required>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input type="password" id="loginPassword" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none" required>
              </div>
              <button type="submit" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20">Log In</button>
            </form>
          </div>

          <!-- Register Form -->
          <div id="registerFormContainer" class="hidden">
            <form onsubmit="App.handleRegisterSubmit(event)" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Minecraft Username</label>
                <input type="text" id="regUsername" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none" required>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input type="email" id="regEmail" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none" required>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input type="password" id="regPassword" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none" required>
              </div>
              <button type="submit" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20">Register Account</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  openProfileModal() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    let modal = document.getElementById('profileModal');
    if (!modal) {
      const modalHTML = `
        <div id="profileModal" role="dialog" aria-modal="true" class="hidden fixed inset-0 z-50 items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button onclick="App.closeProfileModal()" aria-label="Close Modal" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fas fa-times"></i></button>
            <h3 class="text-lg font-bold text-white mb-4"><i class="fas fa-user-cog text-indigo-400 mr-2"></i> Profile & Account Settings</h3>
            
            <form onsubmit="App.handleProfileSubmit(event)" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Avatar Image URL</label>
                <input type="url" id="profileAvatar" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none" required>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">New Password (leave blank to keep current)</label>
                <input type="password" id="profilePassword" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none">
              </div>
              <button type="submit" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">Save Changes</button>
            </form>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      modal = document.getElementById('profileModal');
    }

    document.getElementById('profileAvatar').value = user.avatar;
    document.getElementById('profilePassword').value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  handleProfileSubmit(e) {
    e.preventDefault();
    const avatarVal = document.getElementById('profileAvatar').value.trim();
    const passVal = document.getElementById('profilePassword').value.trim();

    const res = Auth.updateProfile(avatarVal, passVal);
    if (res.success) {
      this.closeProfileModal();
      this.renderHeader();
      this.showToast('Profile settings saved!', 'success');
    } else {
      this.showToast(res.message, 'error');
    }
  },

  handleLoginSubmit(e) {
    e.preventDefault();
    const userVal = document.getElementById('loginUsername').value.trim();
    const passVal = document.getElementById('loginPassword').value.trim();

    const res = Auth.login(userVal, passVal);
    if (res.success) {
      this.closeAuthModal();
      this.renderHeader();
      this.showToast(`Welcome back, ${res.user.username}!`, 'success');
      
      if (window.location.pathname.includes('staff.html') && typeof StaffPage !== 'undefined') {
        StaffPage.init();
      } else {
        window.location.reload();
      }
    } else {
      this.showToast(res.message, 'error');
    }
  },

  handleRegisterSubmit(e) {
    e.preventDefault();
    const userVal = document.getElementById('regUsername').value.trim();
    const emailVal = document.getElementById('regEmail').value.trim();
    const passVal = document.getElementById('regPassword').value.trim();

    const res = Auth.register(userVal, emailVal, passVal);
    if (res.success) {
      this.closeAuthModal();
      this.renderHeader();
      this.showToast(`Account created! Welcome, ${res.user.username}!`, 'success');
      
      if (window.location.pathname.includes('staff.html') && typeof StaffPage !== 'undefined') {
        StaffPage.init();
      } else {
        window.location.reload();
      }
    } else {
      this.showToast(res.message, 'error');
    }
  },

  handleLogout() {
    Auth.logout();
    this.renderHeader();
    this.showToast('Logged out successfully.', 'info');
    
    if (window.location.pathname.includes('staff.html')) {
      window.location.href = 'index.html';
    } else {
      window.location.reload();
    }
  },

  showToast(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 transform translate-x-full transition-all duration-300';
    
    let icon = '<i class="fas fa-info-circle text-indigo-400"></i>';
    if (type === 'success') icon = '<i class="fas fa-check-circle text-emerald-400"></i>';
    if (type === 'error') icon = '<i class="fas fa-exclamation-circle text-rose-400"></i>';

    toast.innerHTML = `${icon} <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => { toast.classList.remove('translate-x-full'); }, 50);

    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
