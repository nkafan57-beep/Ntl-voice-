require('dotenv').config(); // إذا احتجت دعم ملف .env محلياً
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const PREFIX = "!";
let connection = null;
let player = null;

client.on('ready', () => {
    console.log(`Bot is logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(' ');
    const command = args.shift().toLowerCase();

    if (command === "join") {
        if (!message.member.voice.channel) {
            return message.reply("يجب أن تكون في قناة صوتية أولاً.");
        }
        connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });
        message.reply("تم الدخول إلى القناة الصوتية.");
    }

    if (command === "play") {
        if (!connection) return message.reply("يجب أن يدخل البوت إلى القناة الصوتية أولاً باستخدام أمر !join");
        const url = args[0];
        if (!url || !ytdl.validateURL(url)) {
            return message.reply("يرجى وضع رابط فيديو يوتيوب صحيح.");
        }

        const stream = ytdl(url, { filter: 'audioonly' });
        player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
        const resource = createAudioResource(stream);

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
            connection = null;
            player = null;
        });

        message.reply("تم تشغيل الفيديو الصوتي.");
    }
});

// استخدم المتغيّر من env
client.login(process.env.DISCORD_TOKEN);
