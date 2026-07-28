/**
 * AeonMC Discord Webhook Dispatcher
 * Sends formatted embeds to dedicated Discord channels for News, Media, Bug Reports, Staff Reports, and Wiki.
 */

const DISCORD_WEBHOOKS = {
  news: "https://discord.com/api/webhooks/1531761160137871491/A_enRdkpog6QVPM82WE8QhfgzEdKcgb3yWC6QRJcAIRcLttC--Lr9J2PqPs661oneZPt",
  media: "https://discord.com/api/webhooks/1531761387364286656/KK6FhaCFmnCCLEb1XRiSQLloHafnEM4TFz8_GudUwUENXXZSx6Wh9TW2LemjcQBDgz3v",
  bugReports: "https://discord.com/api/webhooks/1531761607837876488/y9OIx5CHmrquzv8wHMBmoVYyCVJV-3QGWIB8DzETf8t3fpWkfNXNvl2mI_00OlOIGzxO",
  staffReports: "https://discord.com/api/webhooks/1531761772858577047/9GXU7SpGmLl8ThAjyl_YuN599bjISoJDXBUvusHti7SWPr_aLSppcwmOVR1qAZfD7eN-",
  wiki: "https://discord.com/api/webhooks/1531761986327674980/ZMrhz6F7hqkdbdayZVEkXgj-PrTtyqWvcyhS0BgHi2-KKOWNo46gTK-6HI4NzBC_fPKG"
};

const Webhooks = {
  async send(category, { title, description, fields = [], color = 0xF59E0B, author = "AeonMC Web Portal" }) {
    const webhookUrl = DISCORD_WEBHOOKS[category];
    if (!webhookUrl) {
      console.warn(`Webhook URL for category "${category}" not configured.`);
      return false;
    }

    const payload = {
      username: "AeonMC Bot",
      avatar_url: "https://aeonmc.com/assets/img/logo.jpg",
      embeds: [
        {
          title: title,
          description: description,
          color: color,
          fields: fields,
          author: { name: author },
          footer: { text: "AeonMC Community Network • play.aeonmc.com" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (err) {
      console.error(`Discord Webhook send error [${category}]:`, err);
      return false;
    }
  }
};
