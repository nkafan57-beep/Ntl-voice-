// المتطلبات
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');

// إعداد ديسكورد بوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// إعداد السيرفر والموقع
const app = express();
const server = http.createServer(app);
const io = new Server(server);

let currentPlayer = null;
let currentConnection = null;
let isLooping = false;
let currentUrl = null;

// صفحة تحكم بسيطة
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/dashboard.html');
});

// Socket.io للتحكم من الموقع
io.on('connection', (socket) => {
    socket.on('play', async (url) => {
        if (!currentConnection || !currentPlayer) return;
        currentUrl = url;
        await playMusic(url);
        io.emit('status', '🎶 تم تشغيل الأغنية');
    });

    socket.on('stop', () => {
        if (currentPlayer) {
            currentPlayer.stop();
            io.emit('status', '⏹️ تم إيقاف الأغنية');
        }
    });

    socket.on('loop', (state) => {
        isLooping = state;
        io.emit('status', isLooping ? '🔁 تم تفعيل التكرار' : '⏹️ تم إيقاف التكرار');
    });
});

// دالة تشغيل الموسيقى
async function playMusic(url) {
    if (!currentConnection || !currentPlayer) return;
    const stream = ytdl(url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);
    currentPlayer.play(resource);
}

// مراقبة نهاية الأغنية للتكرار
function setupPlayerEvents() {
    if (!currentPlayer) return;
    currentPlayer.on(AudioPlayerStatus.Idle, async () => {
        if (isLooping && currentUrl) {
            await playMusic(currentUrl);
        }
    });
}

// أوامر ديسكورد
client.on('messageCreate', async message => {
    if (message.content.startsWith('-join')) {
        if (!message.member.voice.channel) {
            return message.reply('❌ يجب أن تكون في قناة صوتية أولاً!');
        }

        currentConnection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        currentPlayer = createAudioPlayer();
        currentConnection.subscribe(currentPlayer);
        setupPlayerEvents();

        message.reply('✅ تم الانضمام للقناة الصوتية! تحكم بالبوت عبر الموقع.');
    }
});

// تسجيل الدخول للبوت
client.login(process.env.DISCORD_TOKEN);

// تشغيل الموقع على رندر أو محليًا
server.listen(process.env.PORT || 3000, () => {
    console.log('Dashboard on http://localhost:' + (process.env.PORT || 3000));
});
