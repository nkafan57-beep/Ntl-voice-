require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let currentPlayer = null;
let currentConnection = null;
let isLooping = false;
let currentUrl = null;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/dashboard.html');
});

io.on('connection', (socket) => {
    socket.on('play', async (url) => {
        if (!currentConnection || !currentPlayer) {
            io.emit('status', '❌ يجب على البوت الانضمام للفويس أولاً (استخدم -join في الديسكورد)');
            return;
        }
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

async function playMusic(url) {
    if (!currentConnection || !currentPlayer) return;
    try {
        const stream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });
        const resource = createAudioResource(stream, { inlineVolume: true });
        resource.volume.setVolume(0.5);
        currentPlayer.play(resource);
    } catch (err) {
        console.error('خطأ في تشغيل الصوت:', err);
    }
}

function setupPlayerEvents() {
    if (!currentPlayer) return;
    currentPlayer.on(AudioPlayerStatus.Idle, async () => {
        console.log('Player is idle.');
        if (isLooping && currentUrl) {
            await playMusic(currentUrl);
        }
    });
    currentPlayer.on(AudioPlayerStatus.Playing, () => {
        console.log('Player is playing.');
    });
    currentPlayer.on('error', error => {
        console.error('Audio Player Error:', error);
    });
}

// أمر الديسكورد للانضمام للفويس
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

client.login(process.env.DISCORD_TOKEN);

server.listen(process.env.PORT || 3000, () => {
    console.log('Dashboard on http://localhost:' + (process.env.PORT || 3000));
});
