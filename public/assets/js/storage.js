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
  WIKI: 'aeonmc_wiki_articles',
  SETTINGS: 'aeonmc_settings',
  STAFF_APPS: 'aeonmc_staff_apps',
  CREATOR_APPS: 'aeonmc_creator_apps',
  LOGS: 'aeonmc_audit_logs'
};

// Initial Seed Settings matching YAML spec
const DEFAULT_SETTINGS = {
  serverName: "AeonMC Network",
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
    content: "We are excited to announce the launch of AeonMC Season 1! Our community-driven development server features 8 balanced jobs, hand-crafted procedural dungeons, Lootr instanced chests, and Votify daily rewards. Connect now at play.aeonmc.com!",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "news-2",
    title: "Content Creator Partner Program & Media Spotlight",
    tag: "Community",
    author: "Admin",
    date: "July 26, 2026",
    excerpt: "Are you a YouTuber or Twitch streamer? Apply for the Content Creator rank on our Contact desk!",
    content: "We are opening applications for Content Creators! Partners receive exclusive in-game Creator badges, priority queue access, and media spotlights on our website.",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: "news-3",
    title: "Patch 1.0.1 - Jobs Economy Balancing & Staff Portal Update",
    tag: "Patch Notes",
    author: "Moderator",
    date: "July 24, 2026",
    excerpt: "Calibrated payout matrices for Woodcutter and Mining jobs to ensure long-term server economic health.",
    content: "Our dev team has released Patch 1.0.1 targeting job earnings. XP scales linearly with level progression, preventing inflation while rewarding dedicated active players.",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop"
  }
];

const DEFAULT_FORUM_THREADS = [
  {
    id: "thread-1",
    category: "General Discussion",
    title: "Welcome to AeonMC Community Forums! Introduce Yourself",
    author: "Admin",
    authorRole: "Admin",
    date: "2026-07-28",
    views: 142,
    isSticky: true,
    isLocked: false,
    isPrivate: false,
    replies: [
      {
        id: "rep-1",
        author: "Admin",
        authorRole: "Admin",
        date: "2026-07-28",
        content: "Welcome everyone! Feel free to introduce your in-game username, preferred job, and faction build plans below."
      },
      {
        id: "rep-2",
        author: "StevePlayer",
        authorRole: "Player",
        date: "2026-07-28",
        content: "Hey all! Excited to start grinding dungeons with my friends!"
      }
    ]
  },
  {
    id: "thread-2",
    category: "Support & Ban Appeals",
    title: "Private Ticket #1042 - Missing Vote Keys",
    author: "StevePlayer",
    authorRole: "Player",
    date: "2026-07-27",
    views: 12,
    isSticky: false,
    isLocked: false,
    isPrivate: true,
    replies: [
      {
        id: "rep-3",
        author: "StevePlayer",
        authorRole: "Player",
        date: "2026-07-27",
        content: "I voted on TopG and Minecraft Buzz but my inventory was full. Can a staff member check Votify logs?"
      },
      {
        id: "rep-4",
        author: "Moderator",
        authorRole: "Mod",
        date: "2026-07-27",
        content: "Hello Steve! I have credited 2x Vote Keys directly to your claim virtual vault. Type /claim gift to redeem."
      }
    ]
  },
  {
    id: "thread-3",
    category: "Content Creator Hub",
    title: "AeonMC Dungeon Run Episode 1 - Defeating Mythic Boss!",
    author: "SparkYT",
    authorRole: "Content Creator",
    date: "2026-07-25",
    views: 89,
    isSticky: false,
    isLocked: false,
    isPrivate: false,
    replies: [
      {
        id: "rep-5",
        author: "SparkYT",
        authorRole: "Content Creator",
        date: "2026-07-25",
        content: "Check out our full party clear of Tier 3 Procedural Dungeon! Drop a like and subscribe!"
      }
    ]
  }
];

const DEFAULT_MEDIA = [
  {
    id: "m-1",
    title: "AeonMC Spawn Hub & Custom Market Architecture",
    author: "SparkYT",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: "m-2",
    title: "Hand-Crafted Procedural Dungeon Boss Chamber",
    author: "Admin",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: "m-3",
    title: "Player Claim Settlement & Custom Warp Market",
    author: "StevePlayer",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop"
  }
];

const DEFAULT_WIKI = [
  {
    id: "wiki-1",
    category: "Custom Jobs",
    title: "Jobs Reborn System & XP Matrices",
    description: "Choose from 8 calibrated jobs (Miner, Hunter, Weaponsmith, Brewer, Woodcutter, Digger, Builder, Enchanter). Income payouts scale dynamically with AuraSkills levels.",
    content: "AeonMC features a custom calibrated Jobs Reborn economy system. Players can join up to 3 jobs simultaneously.\n\n### Available Jobs\n1. **Miner**: Earn money by mining ores in deep caves.\n2. **Woodcutter**: Earn income by harvesting timber in custom tree biomes.\n3. **Hunter**: Defeat hostile mobs and Mythic Mobs boss mobs.\n4. **Weaponsmith**: Craft weapons and enchant gear.\n\n### Commands\n- `/jobs join [job]` - Join a new job.\n- `/jobs stats` - View active job level and income bonuses.",
    author: "Admin",
    date: "July 28, 2026",
    ratings: [5, 5, 4],
    comments: [
      { id: "wc-1", author: "StevePlayer", date: "July 28, 2026", rating: 5, text: "Super detailed guide! Miner job pays really well." }
    ]
  },
  {
    id: "wiki-2",
    category: "Dungeons",
    title: "Hand-Crafted Procedural Dungeons & Lootr Mechanics",
    description: "Battle through 5 dungeon tiers featuring custom mythic mob boss fights. Chest loot is instanced per-player via Lootr so everyone receives unique rewards.",
    content: "Explore AeonMC's procedural dungeons! Dungeons reset periodically and feature Lootr chests.\n\n### Key Dungeon Features\n- **Instanced Chests**: Every player opening a chest gets their own unique loot drop!\n- **Mythic Boss Fights**: Face custom boss mechanics in Tier 3 to Tier 5 chambers.\n- **Dungeon Keys**: Craft or earn keys through daily voting.\n\n### Commands\n- `/dungeons` - Teleport to dungeon portal lobby.",
    author: "Admin",
    date: "July 28, 2026",
    ratings: [5, 5, 5],
    comments: [
      { id: "wc-2", author: "SparkYT", date: "July 28, 2026", rating: 5, text: "The instanced chests mean no kill-stealing or loot hoards. Fantastic design!" }
    ]
  },
  {
    id: "wiki-3",
    category: "Economy",
    title: "Player Economy, Player Warps & Auction House",
    description: "Trade items safely using player warps, chest shops, and Auction House listings with zero pay-to-win mechanics.",
    content: "AeonMC's economy is entirely player-driven.\n\n### Player Trading Tools\n- **Auction House**: `/ah` allows buying and selling items across the network.\n- **Chest Shops**: Create your own shop at your claim using signs.\n- **Player Warps**: Set public market warps via `/pw set [name]`.",
    author: "Moderator",
    date: "July 27, 2026",
    ratings: [4, 5],
    comments: []
  },
  {
    id: "wiki-4",
    category: "Protection",
    title: "GriefPrevention Land Claiming & Permissions",
    description: "Protect your builds using GriefPrevention claim blocks earned per hour played and via daily voting.",
    content: "Claim your territory easily using a golden shovel.\n\n### Claiming Basics\n1. Right click two opposite corners with a golden shovel to form a claim rectangle.\n2. Use `/trust [player]` to grant build access.\n3. Earn 100 bonus claim blocks for every hour played!",
    author: "Admin",
    date: "July 25, 2026",
    ratings: [5, 4],
    comments: []
  }
];

const DEFAULT_STAFF_APPS = [
  {
    id: "sapp-1",
    username: "Alex_Builder",
    discord: "AlexBuilds#1234",
    position: "Helper",
    experience: "Managed moderation on 2 survival networks for over 1 year.",
    date: "July 27, 2026",
    status: "Pending"
  }
];

const DEFAULT_CREATOR_APPS = [
  {
    id: "capp-1",
    username: "PixelCraft",
    channel: "https://youtube.com/@pixelcraft",
    metrics: "1,200 avg views per video, 15k subscribers",
    date: "July 26, 2026",
    status: "Pending"
  }
];

const StorageDB = {
  get(key) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error(`StorageDB parse error for ${key}:`, e);
      }
    }

    // Default Fallbacks
    if (key === STORAGE_KEYS.USERS) return DEFAULT_USERS;
    if (key === STORAGE_KEYS.SETTINGS) return DEFAULT_SETTINGS;
    if (key === STORAGE_KEYS.NEWS) return DEFAULT_NEWS;
    if (key === STORAGE_KEYS.FORUMS) return DEFAULT_FORUM_THREADS;
    if (key === STORAGE_KEYS.MEDIA) return DEFAULT_MEDIA;
    if (key === STORAGE_KEYS.WIKI) return DEFAULT_WIKI;
    if (key === STORAGE_KEYS.STAFF_APPS) return DEFAULT_STAFF_APPS;
    if (key === STORAGE_KEYS.CREATOR_APPS) return DEFAULT_CREATOR_APPS;
    if (key === STORAGE_KEYS.LOGS) return [];

    return null;
  },

  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  logAction(user, action, details) {
    const logs = this.get(STORAGE_KEYS.LOGS) || [];
    logs.unshift({
      id: "log_" + Date.now(),
      timestamp: new Date().toISOString(),
      user: user,
      action: action,
      details: details
    });
    this.set(STORAGE_KEYS.LOGS, logs.slice(0, 100)); // Keep last 100
  }
};

// Pre-populate storage if empty
if (!localStorage.getItem(STORAGE_KEYS.USERS)) StorageDB.set(STORAGE_KEYS.USERS, DEFAULT_USERS);
if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) StorageDB.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
if (!localStorage.getItem(STORAGE_KEYS.NEWS)) StorageDB.set(STORAGE_KEYS.NEWS, DEFAULT_NEWS);
if (!localStorage.getItem(STORAGE_KEYS.FORUMS)) StorageDB.set(STORAGE_KEYS.FORUMS, DEFAULT_FORUM_THREADS);
if (!localStorage.getItem(STORAGE_KEYS.MEDIA)) StorageDB.set(STORAGE_KEYS.MEDIA, DEFAULT_MEDIA);
if (!localStorage.getItem(STORAGE_KEYS.WIKI)) StorageDB.set(STORAGE_KEYS.WIKI, DEFAULT_WIKI);
if (!localStorage.getItem(STORAGE_KEYS.STAFF_APPS)) StorageDB.set(STORAGE_KEYS.STAFF_APPS, DEFAULT_STAFF_APPS);
if (!localStorage.getItem(STORAGE_KEYS.CREATOR_APPS)) StorageDB.set(STORAGE_KEYS.CREATOR_APPS, DEFAULT_CREATOR_APPS);
