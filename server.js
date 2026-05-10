const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Bot İstemcisi
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

bot.on('ready', () => {
    console.log(`[DISCORD] Bot giriş yaptı: ${bot.user.tag}`);
});

// Gelen JSON verilerini ayrıştırmak için middleware
app.use(express.json());

// Temel durum kontrol (Health Check) endpoint'i
app.get('/api/status', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API aktif ve sorunsuz çalışıyor.',
        timestamp: new Date().toISOString()
    });
});

// 1. Discord Loglama Uç Noktası
app.post('/api/discord/log', (req, res) => {
    const { eventType, content, userId } = req.body;

    if (!eventType || !content) {
        return res.status(400).json({
            success: false,
            message: 'Eksik veri: eventType ve content alanları zorunludur.'
        });
    }

    console.log(`[DISCORD LOG] Event: ${eventType} | UserID: ${userId || 'Bilinmiyor'} | Content: ${content}`);

    res.status(200).json({
        success: true,
        message: 'Log başarıyla kaydedildi.'
    });
});

// 2. Lua Script Sağlayıcı Uç Noktası
app.get('/api/scripts/loader', (req, res) => {
    const authKey = req.query.key;

    if (authKey !== 'gizli_anahtar_123') {
        return res.status(401).send('-- Yetkisiz erişim. Geçerli bir anahtar sağlayın.');
    }

    const luaScript = `
-- Otomatik olarak API'den çekilen Lua Scripti
print("Script başarıyla yüklendi ve çalışıyor!")

local function init()
    warn("Sistem başlatıldı.")
end

init()
    `;

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(luaScript);
});

// 3. Botu Ses Kanalına Sokma Uç Noktası
app.post('/api/bot/join-voice', async (req, res) => {
    const { botToken, guildId, channelId } = req.body;

    if (!botToken || !guildId || !channelId) {
        return res.status(400).json({
            success: false,
            message: 'Eksik veri: botToken, guildId ve channelId gereklidir.'
        });
    }

    try {
        // Eğer bot henüz giriş yapmadıysa belirtilen token ile giriş yap
        if (!bot.isReady()) {
            await bot.login(botToken);
        }

        const guild = await bot.guilds.fetch(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, message: 'Sunucu bulunamadı.' });
        }

        // Sese katılma işlemi
        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        // Bağlantının tamamlanmasını bekle
        await entersState(connection, VoiceConnectionStatus.Ready, 15000);

        res.status(200).json({
            success: true,
            message: `Bot ${channelId} ID'li ses kanalına başarıyla katıldı ve bağlantı stabil.`
        });

    } catch (error) {
        console.error('[SES HATASI]', error);
        res.status(500).json({
            success: false,
            message: 'Sese katılırken bir hata oluştu veya zaman aşımına uğradı.',
            error: error.message
        });
    }
});

// Render gibi platformlarda sürekli çalışması için standart dinleme
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde dinleniyor.`);
});
