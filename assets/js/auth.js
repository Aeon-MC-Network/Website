/**
 * AeonMC Platform - Auth & Role Permission Manager
 * Roles: Player, Content Creator, Mod, Admin
 */

const Auth = {
  getCurrentUser() {
    return StorageDB.get(STORAGE_KEYS.CURRENT_USER);
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  getRole() {
    const user = this.getCurrentUser();
    if (!user) return 'Guest';
    const r = (user.role || '').trim();
    if (r.toLowerCase() === 'mod' || r.toLowerCase() === 'moderator') return 'Mod';
    if (r.toLowerCase() === 'admin' || r.toLowerCase() === 'administrator') return 'Admin';
    if (r.toLowerCase().includes('creator')) return 'Content Creator';
    return 'Player';
  },

  isAdmin() {
    const user = this.getCurrentUser();
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'admin' || role === 'administrator';
  },

  isMod() {
    const user = this.getCurrentUser();
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'mod' || role === 'moderator' || role === 'admin' || role === 'administrator';
  },

  isStaff() {
    return this.isMod() || this.isAdmin();
  },

  isCreator() {
    const user = this.getCurrentUser();
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role.includes('creator') || role === 'mod' || role === 'moderator' || role === 'admin' || role === 'administrator';
  },

  async login(username, password) {
    const apiUrl = (window.API_BASE_URL || '') + '/api/login';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success && data.user) {
        const user = data.user;
        if (user.role && user.role.toLowerCase() === 'moderator') user.role = 'Mod';
        if (user.role && user.role.toLowerCase() === 'administrator') user.role = 'Admin';
        if (!user.avatar) user.avatar = `https://mc-heads.net/avatar/${user.username}/100`;

        StorageDB.set(STORAGE_KEYS.CURRENT_USER, user);
        StorageDB.logAction(user.username, "User Login", `User ${user.username} logged in as ${user.role} via API.`);
        return { success: true, user: user };
      } else {
        // Fallback check against local users
        const users = StorageDB.get(STORAGE_KEYS.USERS) || [];
        const localUser = users.find(
          u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === password
        );

        if (localUser) {
          if (localUser.isBanned) return { success: false, message: "Account suspended by staff." };
          if (localUser.role.toLowerCase() === 'moderator') localUser.role = 'Mod';
          if (localUser.role.toLowerCase() === 'administrator') localUser.role = 'Admin';

          StorageDB.set(STORAGE_KEYS.CURRENT_USER, localUser);
          StorageDB.logAction(localUser.username, "User Login", `User ${localUser.username} logged in as ${localUser.role}.`);
          return { success: true, user: localUser };
        }
        return { success: false, message: data.message || "Invalid username or password." };
      }
    } catch (err) {
      console.warn('API connection failed, attempting local auth fallback:', err);
      const users = StorageDB.get(STORAGE_KEYS.USERS) || [];
      const user = users.find(
        u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === password
      );

      if (user) {
        if (user.isBanned) {
          return { success: false, message: "Account suspended by staff." };
        }
        if (user.role.toLowerCase() === 'moderator') user.role = 'Mod';
        if (user.role.toLowerCase() === 'administrator') user.role = 'Admin';

        StorageDB.set(STORAGE_KEYS.CURRENT_USER, user);
        StorageDB.logAction(user.username, "User Login", `User ${user.username} logged in as ${user.role}.`);
        return { success: true, user: user };
      }

      return { success: false, message: "Invalid username or password." };
    }
  },

  register(username, email, password) {
    const users = StorageDB.get(STORAGE_KEYS.USERS) || [];
    
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: "Username is already taken." };
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: "Email is already registered." };
    }

    const newUser = {
      id: "u_" + Date.now(),
      username: username,
      email: email,
      passwordHash: password,
      role: "Player",
      avatar: `https://mc-heads.net/avatar/${username}/100`,
      createdAt: new Date().toISOString(),
      voteStreak: 0
    };

    users.push(newUser);
    StorageDB.set(STORAGE_KEYS.USERS, users);
    StorageDB.set(STORAGE_KEYS.CURRENT_USER, newUser);
    StorageDB.logAction(username, "User Registered", `New account registered: ${username}`);

    return { success: true, user: newUser };
  },

  logout() {
    const user = this.getCurrentUser();
    if (user) {
      StorageDB.logAction(user.username, "User Logout", `User ${user.username} logged out.`);
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  updateProfile(newAvatar, newPassword) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return { success: false, message: "Not logged in." };

    const users = StorageDB.get(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.id === currentUser.id);

    if (user) {
      if (newAvatar) user.avatar = newAvatar;
      if (newPassword) user.passwordHash = newPassword;

      StorageDB.set(STORAGE_KEYS.USERS, users);
      StorageDB.set(STORAGE_KEYS.CURRENT_USER, user);
      return { success: true };
    }
    return { success: false, message: "User not found." };
  },

  updateUserRole(userId, newRole) {
    if (!this.isAdmin()) {
      return { success: false, message: "Unauthorized. Admin role required." };
    }

    const users = StorageDB.get(STORAGE_KEYS.USERS) || [];
    const targetUser = users.find(u => u.id === userId);

    if (!targetUser) {
      return { success: false, message: "User not found." };
    }

    targetUser.role = newRole;
    StorageDB.set(STORAGE_KEYS.USERS, users);

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.role = newRole;
      StorageDB.set(STORAGE_KEYS.CURRENT_USER, currentUser);
    }

    StorageDB.logAction(currentUser ? currentUser.username : "System", "Update Role", `Updated ${targetUser.username} role to ${newRole}`);
    return { success: true };
  }
};
