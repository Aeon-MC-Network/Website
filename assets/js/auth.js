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
    return user ? user.role : 'Guest';
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'Admin';
  },

  isMod() {
    const user = this.getCurrentUser();
    return user && (user.role === 'Mod' || user.role === 'Admin');
  },

  isStaff() {
    return this.isMod() || this.isAdmin();
  },

  isCreator() {
    const user = this.getCurrentUser();
    return user && (user.role === 'Content Creator' || user.role === 'Mod' || user.role === 'Admin');
  },

  login(username, password) {
    const users = StorageDB.get(STORAGE_KEYS.USERS) || [];
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === password
    );

    if (user) {
      if (user.isBanned) {
        return { success: false, message: "Account suspended by staff." };
      }
      StorageDB.set(STORAGE_KEYS.CURRENT_USER, user);
      StorageDB.logAction(user.username, "User Login", `User ${user.username} logged in as ${user.role}.`);
      return { success: true, user: user };
    }

    return { success: false, message: "Invalid username or password." };
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
      role: "Player", // Default role
      avatar: `https://mc-heads.net/avatar/${username}/100`,
      createdAt: new Date().toISOString(),
      voteStreak: 0
    };

    users.push(newUser);
    StorageDB.set(STORAGE_KEYS.USERS, users);
    StorageDB.set(STORAGE_KEYS.CURRENT_USER, newUser);
    StorageDB.logAction(username, "User Registered", `New account registered: ${username} (Role: Player)`);

    return { success: true, user: newUser };
  },

  logout() {
    const user = this.getCurrentUser();
    if (user) {
      StorageDB.logAction(user.username, "User Logout", `User ${user.username} logged out.`);
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
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

    // If active user updated their own role
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.role = newRole;
      StorageDB.set(STORAGE_KEYS.CURRENT_USER, currentUser);
    }

    StorageDB.logAction(currentUser ? currentUser.username : "System", "Update Role", `Updated ${targetUser.username} role to ${newRole}`);
    return { success: true };
  }
};
