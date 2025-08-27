// تحميل المتغيرات من ملف .env
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const path = require('path');

// إنشاء البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// إعدادات
const musicQueue = new Map();
const MUSIC_FOLDER = './music'; // مجلد الموسيقى لو حاب تضيف ملفات محليًا

class Queue {
    constructor() {
        this.songs = [];
        this.player = createAudioPlayer();
        this.isPlaying = false;
        this.currentSong = null;
        this.repeatCurrentSong = false;
    }
}

function hasPermissions(member) {
    // صلاحيات المستخدم
    return member.permissions.has('Administrator');
}

// تشغيل الأغنية التالية
async function playNextSong(guild) {
    const serverQueue = musicQueue.get(guild.id);
    if (!serverQueue) return;

    let song;
    if (serverQueue.repeatCurrentSong && serverQueue.currentSong) {
        song = serverQueue.currentSong;
    } else {
        if (serverQueue.songs.length === 0) {
            serverQueue.isPlaying = false;
            serverQueue.currentSong = null;
            serverQueue.repeatCurrentSong = false;
            return;
        }
        song = serverQueue.songs.shift();
        serverQueue.currentSong = song;

        if (song.shouldRepeat) {
            serverQueue.repeatCurrentSong = true;
        }
    }

    try {
        let resource;
        if (song.isUrl) {
            const stream = ytdl(song.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            });
            resource = createAudioResource(stream);
        } else {
            resource = createAudioResource(path.join(MUSIC_FOLDER, song.filename));
        }

        serverQueue.player.play(resource);
        serverQueue.isPlaying = true;

        const connection = joinVoiceChannel({
            channelId: song.voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        connection.subscribe(serverQueue.player);

        console.log(`🎵 Now playing: ${song.title}`);

        serverQueue.player.once(AudioPlayerStatus.Idle, () => {
            playNextSong(guild);
        });

    } catch (error) {
        console.error('Error playing song:', error);
        if (serverQueue.songs.length > 0) {
            playNextSong(guild);
        }
    }
}

// أوامر البوت
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // تحقق من الصلاحيات
    if (['-play', '-skip', '-now', '-list', '-url', '-join', '-stop', '-leave', '-help', '-out'].includes(command)) {
        if (!hasPermissions(message.member)) {
            return message.reply('❌ **ليس لديك الصلاحية لاستخدام أوامر الموسيقى!**');
        }
    }

    switch (command) {
        case '-join':
            if (!message.member.voice.channel) {
                return message.reply('❌ **يجب أن تكون في قناة صوتية أولاً!**');
            }
            message.reply('✅ **تم الانضمام إلى القناة الصوتية!**');
            break;

        case '-url':
            if (!args[1]) {
                return message.reply('❌ **يرجى إدخال رابط يوتيوب!**');
            }

            if (!message.member.voice.channel) {
                return message.reply('❌ **يجب أن تكون في قناة صوتية لتشغيل الموسيقى!**');
            }

            const url = args[1];
            const shouldRepeat = args[2] === 'تكرار';

            if (!ytdl.validateURL(url)) {
                return message.reply('❌ **رابط يوتيوب غير صحيح!**');
            }

            try {
                const videoInfo = await ytdl.getBasicInfo(url);
                const videoTitle = videoInfo.videoDetails.title;

                let urlQueue = musicQueue.get(message.guild.id);
                if (!urlQueue) {
                    urlQueue = new Queue();
                    musicQueue.set(message.guild.id, urlQueue);
                }

                urlQueue.songs.push({
                    title: videoTitle,
                    url: url,
                    isUrl: true,
                    shouldRepeat: shouldRepeat,
                    voiceChannel: message.member.voice.channel
                });

                message.reply(`✅ **تم إضافة الفيديو إلى قائمة التشغيل:**\n🎵 \`${videoTitle}\``);

                if (!urlQueue.isPlaying) {
                    playNextSong(message.guild);
                }

            } catch (error) {
                console.error('Error processing YouTube URL:', error);
                message.reply('❌ **حدث خطأ أثناء معالجة رابط يوتيوب!**');
            }
            break;
    }
});

// تسجيل الدخول
client.login(process.env.DISCORD_TOKEN);
