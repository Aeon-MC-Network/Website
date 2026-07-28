/**
 * AeonMC Platform - LocalStorage Engine & Seed Data
 * Synchronized with Server Specification & Architecture
 */

const STORAGE_KEYS = {
  USERS: 'aeonmc_users',
  CURRENT_USER: 'aeonmc_current_user',
  NEWS: 'aeonmc_news',
  FORUMS: 'aeonmc_forum_threads',
  MEDIA: 'aeonmc_media',
  SETTINGS: 'aeonmc_settings',
  STAFF_APPS: 'aeonmc_staff_apps',
  CREATOR_APPS: 'aeonmc_creator_apps',
  LOGS: 'aeonmc_audit_logs'
};

// Initial Seed Settings matching YAML spec
const DEFAULT_SETTINGS = {
  serverName: "AeonMC Network",
  serverNode: "dal-241001.bloom.host",
  serverIP: "play.aeonmc.com",
  serverPort: 8804,
  planAnalyticsURL: "plan.aeonmc.com:8804",
  discordURL: "https://discord.gg/VQgsh8kW2F",
  shopURL: "https://aeon-mc.tebex.store/",
  onlinePlayers: 0,
  maxPlayers: 2000,
  announcement: "⚡ AEONMC SEASON 1 IS LIVE! Connect now with play.aeonmc.com | Discord: discord.gg/VQgsh8kW2F"
};

// Pre-seeded Users with all 4 Roles (Player, Creator, Mod, Admin)
const DEFAULT_USERS = [
  {
    id: "u_admin",
    username: "Admin",
    passwordHash: "admin123",
    email: "admin@aeonmc.com",
    role: "Admin",
    avatar: "https://mc-heads.net/avatar/admin/100",
    createdAt: "2026-07-01T10:00:00.000Z",
    voteStreak: 21
  },
  {
    id: "u_mod",
    username: "Moderator",
    passwordHash: "mod123",
    email: "mod@aeonmc.com",
    role: "Mod",
    avatar: "https://mc-heads.net/avatar/MHF_Alex/100",
    createdAt: "2026-07-05T12:00:00.000Z",
    voteStreak: 12
  },
  {
    id: "u_creator",
    username: "SparkYT",
    passwordHash: "creator123",
    email: "spark@youtube.com",
    role: "Content Creator",
    avatar: "https://mc-heads.net/avatar/Spark/100",
    createdAt: "2026-07-10T14:20:00.000Z",
    voteStreak: 8
  },
  {
    id: "u_player",
    username: "StevePlayer",
    passwordHash: "player123",
    email: "player1@gmail.com",
    role: "Player",
    avatar: "https://mc-heads.net/avatar/Steve/100",
    createdAt: "2026-07-15T15:30:00.000Z",
    voteStreak: 4
  }
];

const DEFAULT_NEWS = [
  {
    id: "news-1",
    title: "AeonMC Season 1 Official Launch & Hand-Crafted Dungeons!",
    tag: "Season Release",
    author: "Admin",
    date: "July 28, 2026",
    excerpt: "Welcome to AeonMC Season 1! Discover procedural dungeons, custom jobs matrices, and a balanced economy.",
    content: "We are excited to announce the launch of AeonMC Season 1! Our custom survival network features 8 balanced jobs, hand-crafted procedural dungeons, Lootr instanced chests, and Votify daily rewards. Connect now at play.aeonmc.com!",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "news-2",
    title: "Content Creator Partner Program & Media Spotlight",
    tag: "Community",
    author: "Admin",
    date: "July 26, 2026",
    excerpt: "Are you a YouTuber or Twitch streamer? Apply for the Content Creator rank on our Media hub!",
    content: "We are opening applications for Content Creators! Partners receive exclusive in-game Creator badges, priority queue access, and media spotlights on our website.",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "news-3",
    title: "Patch 1.0.1 - Jobs Economy Balancing & Staff Portal Update",
    tag: "Patch Notes",
    author: "Moderator",
    date: "July 24, 2026",
    excerpt: "Adjustments to miner job payouts, forum moderation permissions, and Plan analytics integration.",
    content: "In this update, we tuned job income equations to prevent hyperinflation, introduced private support ticket visibility, and upgraded our Plan analytics integration on plan.aeonmc.com:8804.",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop"
  }
];

const DEFAULT_FORUMS = [
  {
    id: "thread-1",
    category: "News & Announcements",
    title: "📌 AeonMC Official Code of Conduct & Connection Guide",
    author: "Admin",
    authorRole: "Admin",
    date: "2026-07-27",
    views: 3420,
    isSticky: true,
    isLocked: true,
    isPrivate: false,
    replies: [
      {
        id: "rep-1",
        author: "Admin",
        authorRole: "Admin",
        date: "2026-07-27",
        content: "Please ensure all players maintain respectful behavior. Official Server IP: play.aeonmc.com | Store: https://aeon-mc.tebex.store/."
      }
    ]
  },
  {
    id: "thread-2",
    category: "General Discussion",
    title: "What is your main job strategy for Season 1?",
    author: "StevePlayer",
    authorRole: "Player",
    date: "2026-07-27",
    views: 184,
    isSticky: false,
    isLocked: false,
    isPrivate: false,
    replies: [
      {
        id: "rep-2",
        author: "SparkYT",
        authorRole: "Content Creator",
        date: "2026-07-27",
        content: "Combining Miner and Weaponsmith early game gives huge economic returns!"
      }
    ]
  },
  {
    id: "thread-3",
    category: "Content Creator Hub",
    title: "🎬 AeonMC Season 1 Episode 1: Building My Base!",
    author: "SparkYT",
    authorRole: "Content Creator",
    date: "2026-07-26",
    views: 520,
    isSticky: false,
    isLocked: false,
    isPrivate: false,
    replies: [
      {
        id: "rep-3",
        author: "StevePlayer",
        authorRole: "Player",
        date: "2026-07-26",
        content: "Awesome video! Subscribed!"
      }
    ]
  },
  {
    id: "thread-4",
    category: "Support & Ban Appeals",
    title: "🔒 [Private Support Ticket] Account Rank Sync Query",
    author: "StevePlayer",
    authorRole: "Player",
    date: "2026-07-25",
    views: 12,
    isSticky: false,
    isLocked: false,
    isPrivate: true, // Visible only to author and Staff/Admins
    replies: [
      {
        id: "rep-4",
        author: "Moderator",
        authorRole: "Mod",
        date: "2026-07-25",
        content: "Your ticket has been reviewed and rank permissions updated!"
      }
    ]
  }
];

const DEFAULT_MEDIA = [
  {
    id: "media-1",
    title: "Season 1 Spawn & Central Hub",
    author: "SparkYT",
    type: "image",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop",
    status: "approved"
  },
  {
    id: "media-2",
    title: "Procedural Dungeon Boss Room",
    author: "Admin",
    type: "image",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
    status: "approved"
  }
];

const DEFAULT_STAFF_APPS = [
  {
    id: "app-1",
    username: "StevePlayer",
    discord: "Steve#1234",
    timezone: "EST (UTC-5)",
    position: "Helper / Moderator",
    experience: "Previous moderator on 2 survival SMP servers.",
    status: "Pending",
    date: "2026-07-28"
  }
];

const DEFAULT_LOGS = [
  {
    id: "log-1",
    timestamp: "2026-07-28 14:00:00",
    user: "Admin",
    action: "Platform Initialized",
    details: "Initialized AeonMC website dataset with auth roles, forums, and staff portal specs."
  }
];

// Data Storage Engine API
const StorageDB = {
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NEWS)) {
      localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(DEFAULT_NEWS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FORUMS)) {
      localStorage.setItem(STORAGE_KEYS.FORUMS, JSON.stringify(DEFAULT_FORUMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MEDIA)) {
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(DEFAULT_MEDIA));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STAFF_APPS)) {
      localStorage.setItem(STORAGE_KEYS.STAFF_APPS, JSON.stringify(DEFAULT_STAFF_APPS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(DEFAULT_LOGS));
    }
  },

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage`, e);
    }
  },

  logAction(username, action, details) {
    const logs = this.get(STORAGE_KEYS.LOGS) || [];
    const newLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toLocaleString(),
      user: username,
      action: action,
      details: details
    };
    logs.unshift(newLog);
    this.set(STORAGE_KEYS.LOGS, logs.slice(0, 50));
  }
};

StorageDB.init();
