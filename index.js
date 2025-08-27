require('dotenv').config(); // استخدام dotenv لتحميل المتغيرات
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

const musicQueue = new Map();

// دالة للعب الموسيقى
async function playMusic(url, connection, player) {
    const stream = ytdl(url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);
    player.play(resource);
    connection.subscribe(player);
}

// حدث عند الانضمام للقناة
client.on('messageCreate', async message => {
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    if (command === '-join') {
        if (!message.member.voice.channel) {
            return message.reply('❌ **يجب أن تكون في قناة صوتية أولاً!**');
        }
        
        const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        // دالة لتشغيل الفيديو
        if (args[1]) {
            const url = args[1];
            await playMusic(url, connection, player);
        }

        message.reply(`✅ **تم الانضمام للقناة الصوتية:** ${message.member.voice.channel.name}`);
    }

    if (command === '-out') {
        const serverQueue = musicQueue.get(message.guild.id);
        if (serverQueue && serverQueue.connection) {
            serverQueue.connection.destroy();
            musicQueue.delete(message.guild.id);
            message.reply('👋 **تم الخروج من القناة الصوتية!**');
        } else {
            message.reply('❌ **البوت ليس في أي قناة صوتية!**');
        }
    }
});

// تسجيل الدخول
client.login(process.env.DISCORD_TOKEN);
