require('dotenv').config(); // ✅ تحميل متغيرات البيئة

// Play next song in queue
async function playNextSong(guild) {
    const serverQueue = musicQueue.get(guild.id);

    let song;
    if (serverQueue.repeatCurrentSong && serverQueue.currentSong) {
        // Keep playing the same song for repeat mode
        song = serverQueue.currentSong;
    } else {
        // Get next song from queue
        if (!serverQueue || serverQueue.songs.length === 0) {
            serverQueue.isPlaying = false;
            serverQueue.currentSong = null;
            serverQueue.repeatCurrentSong = false;
            return;
        }
        song = serverQueue.songs.shift();
        serverQueue.currentSong = song;

        // Set repeat mode based on song preference
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

        console.log(`🎵 Now playing: ${song.title}`);
    } catch (error) {
        console.error('Error playing song:', error);
        if (serverQueue.songs.length > 0) {
            playNextSong(guild);
        }
    }
}

// Handle message commands
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // Check permissions for music commands
    if (['-play', '-skip', '-now', '-list', '-url', '-join', '-stop', '-leave', '-help', '-out'].includes(command)) {
        if (!hasPermissions(message.member, message.guild)) {
            return message.reply('❌ **ليس لديك الصلاحية لاستخدام أوامر الموسيقى!**');
        }
    }

    switch (command) {
        case '-join':
            if (!message.member.voice.channel) {
                return message.reply('❌ **يجب أن تكون في قناة صوتية أولاً!**');
            }

            // Join voice channel logic here
            // ...
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

                    // Join voice channel code here
                    // ...
                }

                // Set repeat mode
                urlQueue.repeatCurrentSong = shouldRepeat;

                urlQueue.songs.push({
                    title: videoTitle,
                    url: url,
                    isUrl: true,
                    shouldRepeat: shouldRepeat
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

        // Add more cases as necessary...
    }
});

// ✅ تسجيل الدخول باستخدام التوكن من env
client.login(process.env.DISCORD_TOKEN);
