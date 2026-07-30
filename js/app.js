/**
 * AeonMC - Client Engine
 * Lightweight static functionality: IP Copy and Server Status
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
  }).catch(() => {
    console.warn('Failed to copy server IP');
  });
}

// Global Event Delegation for clicks
document.addEventListener('click', (e) => {
  // Copy IP Button
  if (e.target.closest('#copyIpBtn')) {
    copyServerIp();
  }
});

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  fetchMinecraftServerStatus();
  setInterval(fetchMinecraftServerStatus, 60000);
});
