/**
 * AeonMC - Client Engine
 * Lightweight static functionality: IP Copy, Server Status, Tebex integration
 */

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

// --- Toast Notification ---
function showToast(message, isBedrock = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  const bgClass = isBedrock ? 'bg-blue-500/90 border-blue-400' : 'bg-amber-500/90 border-amber-400';
  toast.className = `px-4 py-3 rounded-lg border ${bgClass} text-slate-950 font-bold shadow-xl transform translate-y-10 opacity-0 transition-all duration-300`;
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
  if (isBedrock) ipText = '19132'; // Or full string if preferred
  
  navigator.clipboard.writeText(ipText).then(() => {
    if (isBedrock) {
      const btnText = document.getElementById('bedrockIpCopyBtnText');
      if (btnText) {
        const original = btnText.innerText;
        btnText.innerText = 'COPIED PORT!';
        btnText.classList.add('text-blue-200');
        showToast('Bedrock Port copied to clipboard!', true);
        setTimeout(() => {
          btnText.innerText = original;
          btnText.classList.remove('text-blue-200');
        }, 2000);
      }
    } else {
      const btnText = document.getElementById('ipCopyBtnText');
      if (btnText) {
        const original = btnText.innerText;
        btnText.innerText = 'COPIED!';
        btnText.classList.add('text-amber-200');
        showToast('Java IP copied to clipboard!', false);
        setTimeout(() => {
          btnText.innerText = original;
          btnText.classList.remove('text-amber-200');
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
    // Note: To bypass CORS purely on frontend, we might just gracefully fail or link directly if blocked.
    // Tebex headless API usually allows cross-origin for storefronts.
    const res = await fetch('https://headless.tebex.io/api/accounts/1865812/packages', {
      headers: { 'Accept': 'application/json' }
    });
    
    if (res.ok) {
      const packages = await res.json();
      container.innerHTML = ''; // Clear loading text
      
      // Take up to 4 packages
      const topPackages = packages.slice(0, 4);
      if (topPackages.length === 0) throw new Error('No packages');
      
      topPackages.forEach(pkg => {
        const priceStr = pkg.price ? `${pkg.price} ${pkg.currency || 'USD'}` : 'View Store';
        const imgUrl = pkg.image || 'assets/img/62b8530f-faae-4c33-899f-3efcdb3faa94.jpg'; // Fallback
        
        container.innerHTML += `
          <div class="glass-card rounded-2xl overflow-hidden border-amber-500/20 hover:border-amber-500/60 transition-all group flex flex-col">
            <div class="h-40 bg-slate-900 flex items-center justify-center p-4">
              <img src="${imgUrl}" alt="${pkg.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform rounded">
            </div>
            <div class="p-5 flex-1 flex flex-col text-left">
              <h3 class="font-bold text-amber-100 text-lg mb-1">${pkg.name}</h3>
              <p class="text-amber-500 font-black text-xl mb-4">${priceStr}</p>
              <a href="https://aeon-mc.tebex.store/" target="_blank" rel="noopener" class="mt-auto block w-full text-center py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 font-bold transition-colors">Buy Now</a>
            </div>
          </div>
        `;
      });
    } else {
      throw new Error('API Error');
    }
  } catch (err) {
    console.warn('Could not fetch Tebex packages dynamically:', err);
    // Fallback static cards if API fails (e.g. CORS block)
    container.innerHTML = `
      <div class="glass-card p-6 rounded-2xl border-amber-500/20 text-center">
        <h3 class="font-bold text-amber-100 text-lg mb-1">Tin Rank</h3>
        <p class="text-amber-500 font-black text-xl mb-4">$4.99</p>
        <a href="https://aeon-mc.tebex.store/" target="_blank" class="block w-full py-2 rounded-lg bg-amber-500/10 text-amber-400 font-bold">Buy Now</a>
      </div>
      <div class="glass-card p-6 rounded-2xl border-amber-500/20 text-center">
        <h3 class="font-bold text-amber-100 text-lg mb-1">Silver Rank</h3>
        <p class="text-amber-500 font-black text-xl mb-4">$9.99</p>
        <a href="https://aeon-mc.tebex.store/" target="_blank" class="block w-full py-2 rounded-lg bg-amber-500/10 text-amber-400 font-bold">Buy Now</a>
      </div>
      <div class="glass-card p-6 rounded-2xl border-amber-500/20 text-center border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
        <h3 class="font-bold text-amber-100 text-lg mb-1">Gold Rank <span class="text-xs bg-amber-500 text-slate-950 px-2 py-0.5 rounded ml-2">POPULAR</span></h3>
        <p class="text-amber-500 font-black text-xl mb-4">$19.99</p>
        <a href="https://aeon-mc.tebex.store/" target="_blank" class="block w-full py-2 rounded-lg bg-amber-500 text-slate-950 font-bold">Buy Now</a>
      </div>
      <div class="glass-card p-6 rounded-2xl border-amber-500/20 text-center">
        <h3 class="font-bold text-amber-100 text-lg mb-1">Crate Keys</h3>
        <p class="text-amber-500 font-black text-xl mb-4">From $1.99</p>
        <a href="https://aeon-mc.tebex.store/" target="_blank" class="block w-full py-2 rounded-lg bg-amber-500/10 text-amber-400 font-bold">Buy Now</a>
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
  fetchMinecraftServerStatus();
  fetchTebexPackages();
  setInterval(fetchMinecraftServerStatus, 60000);
});
