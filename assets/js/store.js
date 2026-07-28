/**
 * AeonMC Platform - Centralized State Store & RBAC System (store.js)
 * Standardizes localStorage persistence, pub/sub state events, and granular permissions
 */

const initialRoleState = {
  groups: {
    admin: {
      name: "Administrator",
      color: "text-amber-400",
      permissions: ["*"]
    },
    moderator: {
      name: "Moderator",
      color: "text-orange-400",
      permissions: ["forums.delete", "forums.lock", "wiki.edit", "reports.view"]
    },
    member: {
      name: "Community Member",
      color: "text-slate-300",
      permissions: ["forums.create", "wiki.suggest", "media.upload"]
    }
  }
};

// Initialize groups from localStorage if present
const storedGroups = localStorage.getItem('aeon_groups');
if (storedGroups) {
  try {
    initialRoleState.groups = { ...initialRoleState.groups, ...JSON.parse(storedGroups) };
  } catch (e) {
    console.warn('Failed to parse aeon_groups:', e);
  }
}

const Store = {
  listeners: {},

  get(key) {
    return StorageDB.get(key);
  },

  set(key, val) {
    StorageDB.set(key, val);
    this.notify(key, val);
  },

  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  },

  notify(key, val) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => cb(val));
    }
  },

  getGroups() {
    return initialRoleState.groups;
  },

  hasPermission(userGroup, permission) {
    if (!userGroup) return false;
    const normalizedKey = userGroup.toLowerCase().replace(/\s+/g, '_');
    
    // Alias mapping for existing roles
    let key = normalizedKey;
    if (normalizedKey === 'mod' || normalizedKey === 'moderator') key = 'moderator';
    if (normalizedKey === 'admin' || normalizedKey === 'administrator') key = 'admin';
    if (normalizedKey === 'player' || normalizedKey === 'content_creator' || normalizedKey === 'member') key = 'member';

    const group = initialRoleState.groups[key] || initialRoleState.groups[userGroup];
    if (!group) return false;

    if (group.permissions.includes("*") || group.permissions.includes(permission)) {
      return true;
    }
    return false;
  },

  createNewGroup(groupKey, groupName, color, permissions = []) {
    const slug = groupKey.toLowerCase().replace(/\s+/g, '_');
    if (initialRoleState.groups[slug]) return false;

    initialRoleState.groups[slug] = {
      name: groupName,
      color: color || "text-amber-400",
      permissions: permissions
    };

    localStorage.setItem('aeon_groups', JSON.stringify(initialRoleState.groups));
    this.notify('aeon_groups', initialRoleState.groups);
    return true;
  },

  renderRoleGatedComponents() {
    const user = Auth.getCurrentUser();
    const userGroup = user ? user.role : 'member';

    document.querySelectorAll('[data-permission]').forEach(el => {
      const requiredPermission = el.getAttribute('data-permission');
      if (!this.hasPermission(userGroup, requiredPermission)) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
      }
    });
  }
};

window.addEventListener('storage', (e) => {
  if (e.key && Store.listeners[e.key]) {
    try {
      const val = JSON.parse(e.newValue);
      Store.notify(e.key, val);
    } catch (err) {
      console.warn('Storage sync error:', err);
    }
  }
});
