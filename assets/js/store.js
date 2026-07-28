/**
 * AeonMC Platform - Centralized State Store (store.js)
 * Standardizes localStorage persistence & pub/sub state events
 */

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
  }
};

// Global cross-tab storage synchronization listener
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
