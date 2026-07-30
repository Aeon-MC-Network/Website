/**
 * AeonMC - Client Engine
 * Lightweight static functionality: IP Copy, Server Status, Tebex integration, Mobile Nav
 */

// --- Mobile Navigation Drawer ---
function setupMobileNav() {
  const btn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileMenuDrawer');
  const icon = document.getElementById('menuIcon');

  if (btn && drawer && icon) {
    btn.addEventListener('click', () => {
      drawer.classList.toggle('hidden');
      if (drawer.classList.contains('hidden')) {
        // Menu icon (hamburger)
        icon.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
      } else {
        // X icon (close)
        icon.setAttribute('d', 'M6 18L18 6M6 6l12 12');
      }
    });
  }
}

// --- Live Minecraft Server Query API Status ---
async function fetchMinecraftServerStatus() {
  const badgeElement = document.getElementById('playerCountBadge');
  
  try {
    const res = await fetch('https://api.mcsrvstat.us/3/play.aeonmc.com');
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.online) {
        const online = data.players?.online || 0;
        const max = data.players?.max || 500;
        if (badgeElement) {
          badgeElement.innerHTML = `
            <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            Online: ${online} / ${max} Players
          `;
        }
        return;
      }
    }
    
    if (badgeElement) {
      badgeElement.innerHTML = `
        <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
        Server Online: play.aeonmc.com
      `;
    }
  } catch (err) {
    console.warn('Server status query:', err);
    if (badgeElement) {
      badgeElement.innerHTML = `
        <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
        Server Online: play.aeonmc.com
      `;
    }
  }
}

// --- Toast Notification ---
function showToast(message, isBedrock = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  const bgClass = isBedrock ? 'bg-slate-900 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]';
  const textClass = isBedrock ? 'text-blue-300' : 'text-amber-400';
  
  toast.className = `px-6 py-4 rounded-xl border ${bgClass} ${textClass} font-bold text-center tracking-wider uppercase text-sm transform translate-y-10 opacity-0 transition-all duration-300 backdrop-blur-md`;
  toast.innerText = message;
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  });
  
  // Animate out
  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// --- Copy Server IPs ---
function copyServerIp(type) {
  let ipText = 'play.aeonmc.com';
  let isBedrock = type === 'bedrock';
  if (isBedrock) ipText = '19132';
  
  navigator.clipboard.writeText(ipText).then(() => {
    if (isBedrock) {
      const btnText = document.getElementById('bedrockIpCopyBtnText');
      if (btnText) {
        const original = btnText.innerText;
        btnText.innerText = 'COPIED PORT!';
        btnText.classList.add('text-blue-100');
        showToast('Bedrock Port Copied!', true);
        setTimeout(() => {
          btnText.innerText = original;
          btnText.classList.remove('text-blue-100');
        }, 2000);
      }
    } else {
      const btnText = document.getElementById('ipCopyBtnText');
      if (btnText) {
        const original = btnText.innerText;
        btnText.innerText = 'COPIED IP!';
        btnText.classList.add('text-amber-100');
        showToast('Java IP Copied!', false);
        setTimeout(() => {
          btnText.innerText = original;
          btnText.classList.remove('text-amber-100');
        }, 2000);
      }
    }
  }).catch(() => {
    console.warn('Failed to copy server IP');
  });
}

// --- Fetch Tebex Packages ---
async function fetchTebexPackages() {
  const container = document.getElementById('tebex-packages');
  if (!container) return;
  
  try {
    const res = await fetch('https://headless.tebex.io/api/accounts/1865812/packages', {
      headers: { 'Accept': 'application/json' }
    });
    
    if (res.ok) {
      const packages = await res.json();
      container.innerHTML = '';
      
      const topPackages = packages.slice(0, 4);
      if (topPackages.length === 0) throw new Error('No packages');
      
      topPackages.forEach(pkg => {
        const priceStr = pkg.price ? `${pkg.price} ${pkg.currency || 'USD'}` : 'View Store';
        const imgUrl = pkg.image || 'assets/img/62b8530f-faae-4c33-899f-3efcdb3faa94.jpg';
        
        container.innerHTML += `
          <div class="stone-card rounded-2xl overflow-hidden border-amber-500/20 hover:border-amber-500/50 transition-all duration-300 group flex flex-col hover:-translate-y-1">
            <div class="h-44 bg-[#0b1120] flex items-center justify-center p-6 border-b border-amber-500/10">
              <img src="${imgUrl}" alt="${pkg.name}" class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-xl">
            </div>
            <div class="p-6 flex-1 flex flex-col text-center">
              <h3 class="font-serif font-black text-amber-100 text-xl mb-2 tracking-wide">${pkg.name}</h3>
              <p class="text-amber-500 font-bold text-lg mb-6">${priceStr}</p>
              <a href="https://aeon-mc.tebex.store/" target="_blank" rel="noopener" class="mt-auto block w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 text-amber-400 hover:text-slate-950 font-black uppercase tracking-widest text-sm transition-all duration-300">Summon</a>
            </div>
          </div>
        `;
      });
    } else {
      throw new Error('API Error');
    }
  } catch (err) {
    console.warn('Could not fetch Tebex packages dynamically:', err);
    container.innerHTML = `
      <div class="stone-card p-8 rounded-2xl border-amber-500/20 text-center">
        <h3 class="font-serif font-black text-amber-100 text-xl mb-2">Tin Rank</h3>
        <p class="text-amber-500 font-bold text-lg mb-6">$4.99</p>
        <a href="https://aeon-mc.tebex.store/" target="_blank" class="block w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black uppercase tracking-widest text-sm">Summon</a>
      </div>
      <div class="stone-card p-8 rounded-2xl border-amber-500/20 text-center">
        <h3 class="font-serif font-black text-amber-100 text-xl mb-2">Silver Rank</h3>
        <p class="text-amber-500 font-bold text-lg mb-6">$9.99</p>
        <a href="https://aeon-mc.tebex.store/" target="_blank" class="block w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black uppercase tracking-widest text-sm">Summon</a>
      </div>
      <div class="stone-card p-8 rounded-2xl border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-center relative overflow-hidden">
        <div class="absolute top-0 right-0 bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">Popular</div>
        <h3 class="font-serif font-black text-amber-100 text-xl mb-2">Gold Rank</h3>
        <p class="text-amber-500 font-bold text-lg mb-6">$19.99</p>
        <a href="https://aeon-mc.tebex.store/" target="_blank" class="block w-full py-3 rounded-xl bg-amber-500 border border-amber-500 text-slate-950 font-black uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(245,158,11,0.4)]">Summon</a>
      </div>
      <div class="stone-card p-8 rounded-2xl border-amber-500/20 text-center">
        <h3 class="font-serif font-black text-amber-100 text-xl mb-2">Crate Keys</h3>
        <p class="text-amber-500 font-bold text-lg mb-6">From $1.99</p>
        <a href="https://aeon-mc.tebex.store/" target="_blank" class="block w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black uppercase tracking-widest text-sm">Summon</a>
      </div>
    `;
  }
}

// Global Event Delegation for clicks
document.addEventListener('click', (e) => {
  // Copy IP Buttons
  if (e.target.closest('#copyIpBtn')) {
    copyServerIp('java');
  } else if (e.target.closest('#copyBedrockIpBtn')) {
    copyServerIp('bedrock');
  }
});

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  setupMobileNav();
  fetchMinecraftServerStatus();
  fetchTebexPackages();
  setInterval(fetchMinecraftServerStatus, 60000);
});
